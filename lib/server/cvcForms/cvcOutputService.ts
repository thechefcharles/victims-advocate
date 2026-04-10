/**
 * Domain 2.3 — CVC Form Processing: runtime output service.
 *
 * Central orchestration for CVC PDF generation.
 *
 * Pipeline (generateCvcForm):
 *   1. Load case + active template
 *   2. can("cvc_form:generate") with case-as-resource (org scope, advocate gate, status)
 *   3. Hard gate: isEligibilityCompleted(caseId) → throw VALIDATION_ERROR if false
 *   4. validateCvcGenerationReadiness — check required canonical fields present
 *   5. Resolve OutputPayload via resolveCanonicalOutputData
 *   6. Insert output_generation_jobs row (status='pending')
 *   7. Update job → 'processing'
 *   8. Render via pdfRenderService.renderCvcPdf
 *   9. Upload bytes to Supabase storage (case-documents bucket)
 *   10. Call documentService.uploadDocument with the storage path
 *   11. Update job → 'completed', set generated_document_id
 *   12. emitSignal cvc_form_generated, audit log
 *
 * On any error after step 6: update job → 'failed', set failure_reason,
 * emit cvc_form_generation_failed.
 *
 * Synchronous v1: same request creates the job and processes it. Caller
 * sees the completed job (or error) in the same response.
 *
 * Data class: Class A (case data) + Class B (job audit).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { logEvent } from "@/lib/server/audit/logEvent";
import { emitSignal } from "@/lib/server/trustSignal";
import { getCaseRecordById } from "@/lib/server/cases/caseRepository";
import { uploadDocument } from "@/lib/server/documents/documentService";
import {
  getEligibilityForCase,
  isEligibilityCompleted,
} from "@/lib/server/eligibility/eligibilityService";
import type { AuthContext } from "@/lib/server/auth/context";
import type { PolicyResource } from "@/lib/server/policy/policyTypes";
import type { CompensationApplication } from "@/lib/compensationSchema";
import {
  getActiveCvcFormTemplate,
  getCvcFormFieldsByTemplateId,
  getAlignmentMappingsByTemplateId,
  insertOutputGenerationJob,
  updateOutputGenerationJobStatus,
  getLatestOutputJobByCaseId,
} from "./cvcFormRepository";
import { renderCvcPdf } from "./pdfRenderService";
import {
  serializeForRuntime,
  serializeOutputJobStatus,
} from "./cvcFormSerializer";
import type {
  CvcFormTemplateRecord,
  CvcFormFieldRecord,
  FormAlignmentMappingRecord,
  OutputGenerationJobRecord,
  OutputPayload,
  RuntimePreviewView,
  OutputJobStatusView,
} from "./cvcFormTypes";

const STORAGE_BUCKET = "case-documents";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function caseToCvcFormResource(record: {
  id: string;
  organization_id: string | null;
  assigned_advocate_id: string | null;
  status: string;
}): PolicyResource {
  return {
    type: "cvc_form_template",
    id: record.id,
    tenantId: record.organization_id ?? undefined,
    assignedTo: record.assigned_advocate_id ?? undefined,
    status: record.status,
  };
}

function jobToResource(job: OutputGenerationJobRecord, caseRecord: {
  organization_id: string | null;
  assigned_advocate_id: string | null;
}): PolicyResource {
  return {
    type: "output_generation_job",
    id: job.id,
    tenantId: caseRecord.organization_id ?? undefined,
    assignedTo: caseRecord.assigned_advocate_id ?? undefined,
  };
}

function denyForbidden(reason?: string): never {
  throw new AppError("FORBIDDEN", reason ?? "Access denied.");
}

function readDottedPath(payload: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cursor: unknown = payload;
  for (const part of parts) {
    if (!cursor || typeof cursor !== "object") return null;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor ?? null;
}

function applyTransform(
  value: unknown,
  transformType: string | null,
  config?: Record<string, unknown> | null,
): string | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;

  const stringValue = typeof value === "string" ? value : String(value);

  if (!transformType) return stringValue;

  switch (transformType) {
    case "date_reformat": {
      // YYYY-MM-DD → MM/DD/YYYY (most common case)
      const parts = stringValue.split("-");
      if (parts.length !== 3) return stringValue;
      const [y, m, d] = parts;
      return `${m}/${d}/${y}`;
    }
    case "phone_split": {
      // Optional config.part: 'area' | 'prefix' | 'line'
      const digits = stringValue.replace(/\D/g, "");
      const part = (config?.part as string | undefined) ?? "all";
      if (part === "area") return digits.slice(0, 3);
      if (part === "prefix") return digits.slice(3, 6);
      if (part === "line") return digits.slice(6, 10);
      return digits;
    }
    case "currency_format": {
      const num = Number(stringValue);
      if (Number.isNaN(num)) return stringValue;
      return `$${num.toFixed(2)}`;
    }
    default:
      return stringValue;
  }
}

// ---------------------------------------------------------------------------
// resolveCanonicalOutputData — pure mapper from intake/eligibility → fields
// ---------------------------------------------------------------------------

export function resolveCanonicalOutputData(
  application: CompensationApplication,
  fields: CvcFormFieldRecord[],
  mappings: FormAlignmentMappingRecord[],
  eligibilityAnswers: Record<string, unknown> | null,
): OutputPayload {
  const resolvedFields: Record<string, string | boolean | null> = {};
  const warnings: string[] = [];

  // Index mappings by field id for quick lookup
  const mappingsByFieldId = new Map<string, FormAlignmentMappingRecord>();
  for (const m of mappings) mappingsByFieldId.set(m.cvc_form_field_id, m);

  for (const field of fields) {
    const mapping = mappingsByFieldId.get(field.id);
    if (!mapping) {
      // Unmapped fields don't contribute — only flagged at activation time
      // (validateFormAlignmentCompleteness). Here we just record null.
      resolvedFields[field.field_key] = null;
      continue;
    }

    let rawValue: unknown = null;
    if (mapping.mapping_purpose === "intake" || mapping.mapping_purpose === "output") {
      const path = mapping.intake_field_path ?? mapping.canonical_field_key;
      rawValue = readDottedPath(application as unknown as Record<string, unknown>, path);
    } else if (mapping.mapping_purpose === "eligibility") {
      if (mapping.eligibility_field_key && eligibilityAnswers) {
        rawValue = eligibilityAnswers[mapping.eligibility_field_key] ?? null;
      }
    } else if (mapping.mapping_purpose === "computed") {
      // Computed mappings are not implemented in v1 — flag as warning
      warnings.push(`computed mapping not yet supported for field ${field.field_key}`);
    }

    resolvedFields[field.field_key] = applyTransform(
      rawValue,
      mapping.transform_type,
      mapping.transform_config,
    );
  }

  return { application, resolvedFields, warnings };
}

// ---------------------------------------------------------------------------
// validateCvcGenerationReadiness — pure check, no DB writes
// ---------------------------------------------------------------------------

export function validateCvcGenerationReadiness(
  fields: CvcFormFieldRecord[],
  mappings: FormAlignmentMappingRecord[],
  application: CompensationApplication,
): { ready: boolean; missingFields: string[] } {
  const missing: string[] = [];
  const mappingsByFieldId = new Map<string, FormAlignmentMappingRecord>();
  for (const m of mappings) mappingsByFieldId.set(m.cvc_form_field_id, m);

  for (const field of fields) {
    if (!field.required) continue;
    const mapping = mappingsByFieldId.get(field.id);
    if (!mapping) {
      missing.push(field.field_key);
      continue;
    }
    const path = mapping.intake_field_path ?? mapping.canonical_field_key;
    const value = readDottedPath(application as unknown as Record<string, unknown>, path);
    if (value === null || value === undefined || value === "") {
      missing.push(field.field_key);
    }
  }

  return { ready: missing.length === 0, missingFields: missing };
}

// ---------------------------------------------------------------------------
// previewCvcForm
// ---------------------------------------------------------------------------

export async function previewCvcForm(
  ctx: AuthContext,
  caseId: string,
  supabase: SupabaseClient,
): Promise<RuntimePreviewView> {
  const caseRecord = await getCaseRecordById(supabase, caseId);
  if (!caseRecord) throw new AppError("NOT_FOUND", "Case not found.");

  const actor = buildActor(ctx);
  const decision = await can(
    "cvc_form:preview",
    actor,
    caseToCvcFormResource(caseRecord),
  );
  if (!decision.allowed) denyForbidden(decision.message);

  if (!caseRecord.state_code || (caseRecord.state_code !== "IL" && caseRecord.state_code !== "IN")) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Case has no valid state_code — cannot preview CVC form.",
    );
  }

  const template = await getActiveCvcFormTemplate(supabase, caseRecord.state_code);
  if (!template) {
    return {
      state_code: caseRecord.state_code,
      template_id: "(none)",
      template_uuid: "",
      version_number: 0,
      generation_readiness: "missing_required_fields",
      missing_required_fields: ["(no active CVC template configured for this state)"],
      completeness_warning: null,
    };
  }

  const eligibilityCompleted = await isEligibilityCompleted(caseId, supabase);
  if (!eligibilityCompleted) {
    return {
      state_code: caseRecord.state_code,
      template_id: template.template_id,
      template_uuid: template.id,
      version_number: template.version_number,
      generation_readiness: "missing_eligibility",
      missing_required_fields: [],
      completeness_warning: null,
    };
  }

  const [fields, mappings] = await Promise.all([
    getCvcFormFieldsByTemplateId(supabase, template.id),
    getAlignmentMappingsByTemplateId(supabase, template.id),
  ]);

  const application = await loadCaseApplication(supabase, caseId);
  const readiness = validateCvcGenerationReadiness(fields, mappings, application);

  return serializeForRuntime(template, readiness);
}

// ---------------------------------------------------------------------------
// generateCvcForm — the heavy hitter
// ---------------------------------------------------------------------------

export async function generateCvcForm(
  ctx: AuthContext,
  caseId: string,
  supabase: SupabaseClient,
): Promise<OutputJobStatusView> {
  const caseRecord = await getCaseRecordById(supabase, caseId);
  if (!caseRecord) throw new AppError("NOT_FOUND", "Case not found.");

  const actor = buildActor(ctx);
  const decision = await can(
    "cvc_form:generate",
    actor,
    caseToCvcFormResource(caseRecord),
  );
  if (!decision.allowed) denyForbidden(decision.message);

  if (!caseRecord.state_code || (caseRecord.state_code !== "IL" && caseRecord.state_code !== "IN")) {
    throw new AppError("VALIDATION_ERROR", "Case has no valid state_code.");
  }

  // Hard gate: eligibility must be completed
  const eligibilityCompleted = await isEligibilityCompleted(caseId, supabase);
  if (!eligibilityCompleted) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Eligibility assessment not completed. Cannot generate CVC form.",
    );
  }

  const template = await getActiveCvcFormTemplate(supabase, caseRecord.state_code);
  if (!template) {
    throw new AppError(
      "VALIDATION_ERROR",
      `No active CVC form template configured for state ${caseRecord.state_code}.`,
    );
  }

  const [fields, mappings, eligibility, application] = await Promise.all([
    getCvcFormFieldsByTemplateId(supabase, template.id),
    getAlignmentMappingsByTemplateId(supabase, template.id),
    getEligibilityForCase(caseId, supabase),
    loadCaseApplication(supabase, caseId),
  ]);

  const readiness = validateCvcGenerationReadiness(fields, mappings, application);
  if (!readiness.ready) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Required CVC fields are missing: ${readiness.missingFields.join(", ")}`,
      { missingFields: readiness.missingFields },
    );
  }

  // Soft warning: completeness gate (does not block)
  const completenessWarning: string | null = null;

  // Create the job row
  const job = await insertOutputGenerationJob(supabase, {
    case_id: caseId,
    cvc_form_template_id: template.id,
    state_code: caseRecord.state_code,
    created_by: ctx.userId,
  });

  try {
    // Mark processing
    await updateOutputGenerationJobStatus(supabase, job.id, "processing");

    // Resolve canonical data + render PDF
    const payload = resolveCanonicalOutputData(application, fields, mappings, eligibility.answers);
    const pdfBytes = await renderCvcPdf(template.template_id, payload.application);

    // Store via documentService — uploads to storage first, then registers the doc row.
    const { documentId } = await storeGeneratedCvcOutput(
      ctx,
      caseRecord.organization_id ?? null,
      caseId,
      template.template_id,
      caseRecord.state_code,
      pdfBytes,
      supabase,
    );

    const completedJob = await updateOutputGenerationJobStatus(supabase, job.id, "completed", {
      generated_document_id: documentId,
      generation_metadata: {
        warnings: [...payload.warnings, ...(completenessWarning ? [completenessWarning] : [])],
        template_version: template.version_number,
      },
      completed_at: new Date().toISOString(),
    });

    if (caseRecord.organization_id) {
      void emitSignal(
        {
          orgId: caseRecord.organization_id,
          signalType: "cvc_form_generated",
          value: 1,
          actorUserId: ctx.userId,
          actorAccountType: ctx.accountType,
          idempotencyKey: `cvc_form_generated:${job.id}`,
          metadata: {
            case_id: caseId,
            template_id: template.template_id,
            template_version: template.version_number,
          },
        },
        supabase,
      );
    }

    void logEvent({
      ctx,
      action: "workflow.state_transition",
      resourceType: "output_generation_job",
      resourceId: job.id,
      organizationId: caseRecord.organization_id,
      severity: "info",
      metadata: {
        action_subtype: "cvc_form.generated",
        case_id: caseId,
        template_id: template.template_id,
        document_id: documentId,
      },
    });

    return serializeOutputJobStatus(completedJob);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateOutputGenerationJobStatus(supabase, job.id, "failed", {
      failure_reason: message,
      completed_at: new Date().toISOString(),
    });

    if (caseRecord.organization_id) {
      void emitSignal(
        {
          orgId: caseRecord.organization_id,
          signalType: "cvc_form_generation_failed",
          value: 1,
          actorUserId: ctx.userId,
          actorAccountType: ctx.accountType,
          idempotencyKey: `cvc_form_generation_failed:${job.id}`,
          metadata: { case_id: caseId, error: message },
        },
        supabase,
      );
    }

    void logEvent({
      ctx,
      action: "workflow.state_transition",
      resourceType: "output_generation_job",
      resourceId: job.id,
      organizationId: caseRecord.organization_id,
      severity: "warning",
      metadata: {
        action_subtype: "cvc_form.generation_failed",
        case_id: caseId,
        error: message,
      },
    });

    throw new AppError("INTERNAL", `CVC generation failed: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// storeGeneratedCvcOutput — bytes → storage → documentService
// ---------------------------------------------------------------------------

async function storeGeneratedCvcOutput(
  ctx: AuthContext,
  orgId: string | null,
  caseId: string,
  templateId: string,
  stateCode: "IL" | "IN",
  pdfBytes: Uint8Array,
  supabase: SupabaseClient,
): Promise<{ documentId: string }> {
  const fileName = `${templateId}_${caseId}_${Date.now()}.pdf`;
  const storagePath = `${ctx.userId}/${caseId}/cvc/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, pdfBytes, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/pdf",
    });

  if (uploadError) {
    throw new Error(`storage upload failed: ${uploadError.message}`);
  }

  const actor = buildActor(ctx);
  const docView = await uploadDocument(
    actor,
    {
      doc_type: stateCode === "IL" ? "cvc_generated_il" : "cvc_generated_in",
      file_name: fileName,
      mime_type: "application/pdf",
      file_size: pdfBytes.byteLength,
      storage_path: storagePath,
      organization_id: orgId,
      linked_object_type: "case",
      linked_object_id: caseId,
    },
    supabase,
  );

  return { documentId: docView.id };
}

// ---------------------------------------------------------------------------
// getCvcFormGenerationStatus
// ---------------------------------------------------------------------------

export async function getCvcFormGenerationStatus(
  ctx: AuthContext,
  caseId: string,
  supabase: SupabaseClient,
): Promise<OutputJobStatusView | null> {
  const caseRecord = await getCaseRecordById(supabase, caseId);
  if (!caseRecord) throw new AppError("NOT_FOUND", "Case not found.");

  const actor = buildActor(ctx);
  const decision = await can(
    "cvc_form:preview",
    actor,
    caseToCvcFormResource(caseRecord),
  );
  if (!decision.allowed) denyForbidden(decision.message);

  const job = await getLatestOutputJobByCaseId(supabase, caseId);
  if (!job) return null;

  // Re-check policy against the job resource (catches advocate gate consistently)
  const jobDecision = await can(
    "cvc_form:preview",
    actor,
    jobToResource(job, caseRecord),
  );
  if (!jobDecision.allowed) denyForbidden(jobDecision.message);

  return serializeOutputJobStatus(job);
}

// ---------------------------------------------------------------------------
// loadCaseApplication — best-effort intake snapshot loader
// ---------------------------------------------------------------------------

async function loadCaseApplication(
  supabase: SupabaseClient,
  caseId: string,
): Promise<CompensationApplication> {
  // First try the legacy cases.application column (still the primary source today).
  const { data, error } = await supabase
    .from("cases")
    .select("application")
    .eq("id", caseId)
    .maybeSingle();
  if (error) throw new Error(`loadCaseApplication: ${error.message}`);

  const raw = (data as { application: unknown } | null)?.application ?? null;
  if (raw && typeof raw === "object") return raw as CompensationApplication;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as CompensationApplication;
    } catch {
      // fall through
    }
  }
  throw new AppError("VALIDATION_ERROR", "Case has no application data — cannot generate CVC form.");
}
