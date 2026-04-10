/**
 * Domain 2.3 — CVC Form Processing: data access layer.
 *
 * Pure DB I/O. No business logic. No serialization. No policy checks.
 *
 * The new resolver getActiveCvcFormTemplate(supabase, stateCode) lives here —
 * Domain 2.2 was assumed to expose this but never built it.
 *
 * Data class: Class C / Class B (output_generation_jobs).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CvcFormTemplateRecord,
  CvcFormFieldRecord,
  FormAlignmentMappingRecord,
  OutputGenerationJobRecord,
  CvcFormTemplateStatus,
  OutputGenerationJobStatus,
  CreateCvcFormTemplateInput,
  CreateCvcFormFieldInput,
  CreateFormAlignmentMappingInput,
  UpdateCvcFormTemplateInput,
} from "./cvcFormTypes";

const TEMPLATES_TABLE = "cvc_form_templates" as const;
const FIELDS_TABLE = "cvc_form_fields" as const;
const MAPPINGS_TABLE = "form_alignment_mappings" as const;
const JOBS_TABLE = "output_generation_jobs" as const;

// ---------------------------------------------------------------------------
// Templates — read
// ---------------------------------------------------------------------------

export async function getCvcFormTemplateById(
  supabase: SupabaseClient,
  id: string,
): Promise<CvcFormTemplateRecord | null> {
  const { data, error } = await supabase
    .from(TEMPLATES_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getCvcFormTemplateById: ${error.message}`);
  return (data as CvcFormTemplateRecord | null) ?? null;
}

/**
 * The function Domain 2.2 was assumed to expose but never built. Lives here.
 * Returns the active template for the given state, or null if none exists.
 */
export async function getActiveCvcFormTemplate(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
): Promise<CvcFormTemplateRecord | null> {
  const { data, error } = await supabase
    .from(TEMPLATES_TABLE)
    .select("*")
    .eq("state_code", stateCode)
    .eq("status", "active")
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getActiveCvcFormTemplate: ${error.message}`);
  return (data as CvcFormTemplateRecord | null) ?? null;
}

export async function listCvcFormTemplates(
  supabase: SupabaseClient,
  filters: { stateCode?: "IL" | "IN"; status?: CvcFormTemplateStatus } = {},
): Promise<CvcFormTemplateRecord[]> {
  let query = supabase
    .from(TEMPLATES_TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (filters.stateCode) query = query.eq("state_code", filters.stateCode);
  if (filters.status) query = query.eq("status", filters.status);
  const { data, error } = await query;
  if (error) throw new Error(`listCvcFormTemplates: ${error.message}`);
  return (data as CvcFormTemplateRecord[]) ?? [];
}

export async function getMaxVersionNumberForState(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
): Promise<number> {
  const { data, error } = await supabase
    .from(TEMPLATES_TABLE)
    .select("version_number")
    .eq("state_code", stateCode)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getMaxVersionNumberForState: ${error.message}`);
  return (data as { version_number: number } | null)?.version_number ?? 0;
}

// ---------------------------------------------------------------------------
// Templates — write
// ---------------------------------------------------------------------------

export async function insertCvcFormTemplate(
  supabase: SupabaseClient,
  input: CreateCvcFormTemplateInput & { created_by: string | null; version_number: number },
): Promise<CvcFormTemplateRecord> {
  const { data, error } = await supabase
    .from(TEMPLATES_TABLE)
    .insert({
      state_code: input.state_code,
      form_name: input.form_name,
      template_id: input.template_id,
      version_number: input.version_number,
      status: "draft",
      source_pdf_path: input.source_pdf_path ?? null,
      seeded_from: input.seeded_from ?? null,
      state_workflow_config_id: input.state_workflow_config_id ?? null,
      created_by: input.created_by,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`insertCvcFormTemplate: ${error?.message ?? "no row"}`);
  return data as CvcFormTemplateRecord;
}

export async function updateCvcFormTemplateStatus(
  supabase: SupabaseClient,
  id: string,
  status: CvcFormTemplateStatus,
  patch?: { published_at?: string | null; deprecated_at?: string | null },
): Promise<CvcFormTemplateRecord> {
  const { data, error } = await supabase
    .from(TEMPLATES_TABLE)
    .update({
      status,
      ...(patch?.published_at !== undefined ? { published_at: patch.published_at } : {}),
      ...(patch?.deprecated_at !== undefined ? { deprecated_at: patch.deprecated_at } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data)
    throw new Error(`updateCvcFormTemplateStatus: ${error?.message ?? "no row"}`);
  return data as CvcFormTemplateRecord;
}

export async function updateCvcFormTemplateFields(
  supabase: SupabaseClient,
  id: string,
  patch: UpdateCvcFormTemplateInput,
): Promise<CvcFormTemplateRecord> {
  const { data, error } = await supabase
    .from(TEMPLATES_TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data)
    throw new Error(`updateCvcFormTemplateFields: ${error?.message ?? "no row"}`);
  return data as CvcFormTemplateRecord;
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

export async function insertCvcFormField(
  supabase: SupabaseClient,
  templateId: string,
  input: CreateCvcFormFieldInput,
): Promise<CvcFormFieldRecord> {
  const { data, error } = await supabase
    .from(FIELDS_TABLE)
    .insert({
      template_id: templateId,
      field_key: input.field_key,
      label: input.label ?? null,
      field_type: input.field_type,
      page_number: input.page_number ?? null,
      x: input.x ?? null,
      y: input.y ?? null,
      font_size: input.font_size ?? null,
      required: input.required ?? false,
      source_path: input.source_path ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`insertCvcFormField: ${error?.message ?? "no row"}`);
  return data as CvcFormFieldRecord;
}

export async function getCvcFormFieldsByTemplateId(
  supabase: SupabaseClient,
  templateId: string,
): Promise<CvcFormFieldRecord[]> {
  const { data, error } = await supabase
    .from(FIELDS_TABLE)
    .select("*")
    .eq("template_id", templateId);
  if (error) throw new Error(`getCvcFormFieldsByTemplateId: ${error.message}`);
  return (data as CvcFormFieldRecord[]) ?? [];
}

// ---------------------------------------------------------------------------
// Alignment mappings
// ---------------------------------------------------------------------------

export async function insertFormAlignmentMapping(
  supabase: SupabaseClient,
  templateId: string,
  input: CreateFormAlignmentMappingInput,
): Promise<FormAlignmentMappingRecord> {
  const { data, error } = await supabase
    .from(MAPPINGS_TABLE)
    .insert({
      template_id: templateId,
      cvc_form_field_id: input.cvc_form_field_id,
      canonical_field_key: input.canonical_field_key,
      intake_field_path: input.intake_field_path ?? null,
      eligibility_field_key: input.eligibility_field_key ?? null,
      mapping_purpose: input.mapping_purpose,
      transform_type: input.transform_type ?? null,
      transform_config: input.transform_config ?? null,
      required: input.required ?? false,
    })
    .select("*")
    .single();
  if (error || !data)
    throw new Error(`insertFormAlignmentMapping: ${error?.message ?? "no row"}`);
  return data as FormAlignmentMappingRecord;
}

export async function getAlignmentMappingsByTemplateId(
  supabase: SupabaseClient,
  templateId: string,
): Promise<FormAlignmentMappingRecord[]> {
  const { data, error } = await supabase
    .from(MAPPINGS_TABLE)
    .select("*")
    .eq("template_id", templateId);
  if (error) throw new Error(`getAlignmentMappingsByTemplateId: ${error.message}`);
  return (data as FormAlignmentMappingRecord[]) ?? [];
}

// ---------------------------------------------------------------------------
// Output generation jobs
// ---------------------------------------------------------------------------

export async function insertOutputGenerationJob(
  supabase: SupabaseClient,
  input: {
    case_id: string;
    cvc_form_template_id: string;
    state_code: "IL" | "IN";
    created_by: string | null;
  },
): Promise<OutputGenerationJobRecord> {
  const { data, error } = await supabase
    .from(JOBS_TABLE)
    .insert({
      case_id: input.case_id,
      cvc_form_template_id: input.cvc_form_template_id,
      state_code: input.state_code,
      status: "pending",
      created_by: input.created_by,
    })
    .select("*")
    .single();
  if (error || !data)
    throw new Error(`insertOutputGenerationJob: ${error?.message ?? "no row"}`);
  return data as OutputGenerationJobRecord;
}

export async function updateOutputGenerationJobStatus(
  supabase: SupabaseClient,
  jobId: string,
  status: OutputGenerationJobStatus,
  patch?: {
    generated_document_id?: string | null;
    generation_metadata?: Record<string, unknown>;
    failure_reason?: string | null;
    completed_at?: string | null;
  },
): Promise<OutputGenerationJobRecord> {
  const { data, error } = await supabase
    .from(JOBS_TABLE)
    .update({
      status,
      ...(patch?.generated_document_id !== undefined
        ? { generated_document_id: patch.generated_document_id }
        : {}),
      ...(patch?.generation_metadata !== undefined
        ? { generation_metadata: patch.generation_metadata }
        : {}),
      ...(patch?.failure_reason !== undefined ? { failure_reason: patch.failure_reason } : {}),
      ...(patch?.completed_at !== undefined ? { completed_at: patch.completed_at } : {}),
    })
    .eq("id", jobId)
    .select("*")
    .single();
  if (error || !data)
    throw new Error(`updateOutputGenerationJobStatus: ${error?.message ?? "no row"}`);
  return data as OutputGenerationJobRecord;
}

export async function getLatestOutputJobByCaseId(
  supabase: SupabaseClient,
  caseId: string,
): Promise<OutputGenerationJobRecord | null> {
  const { data, error } = await supabase
    .from(JOBS_TABLE)
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestOutputJobByCaseId: ${error.message}`);
  return (data as OutputGenerationJobRecord | null) ?? null;
}
