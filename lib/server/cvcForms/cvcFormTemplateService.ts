/**
 * Domain 2.3 — CVC Form Processing: admin template management.
 *
 * Every mutating function: can() → validate → execute → signal/audit.
 * Status changes go through the workflow engine (Rule 16 Transition Law).
 *
 * Activation always runs validateFormAlignmentCompleteness as a hard gate
 * before transitioning. validateAlignment() exposes the same check as a
 * separate explicit admin action so admins can preview without committing.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { transition } from "@/lib/server/workflow/engine";
import { logEvent } from "@/lib/server/audit/logEvent";
import { emitSignal } from "@/lib/server/trustSignal";
import {
  invalidateWorkflowDerivedData,
} from "@/lib/server/stateWorkflows/invalidation";
import type { AuthContext } from "@/lib/server/auth/context";
import type { PolicyResource } from "@/lib/server/policy/policyTypes";
import {
  getCvcFormTemplateById,
  getMaxVersionNumberForState,
  listCvcFormTemplates,
  insertCvcFormTemplate,
  updateCvcFormTemplateStatus,
  updateCvcFormTemplateFields,
  insertCvcFormField,
  insertFormAlignmentMapping,
  getCvcFormFieldsByTemplateId,
  getAlignmentMappingsByTemplateId,
} from "./cvcFormRepository";
import { validateFormAlignmentCompleteness } from "./configValidation";
import { serializeForAdmin } from "./cvcFormSerializer";
import type {
  CvcFormTemplateRecord,
  CvcFormTemplateStatus,
  CreateCvcFormTemplateInput,
  CreateCvcFormFieldInput,
  CreateFormAlignmentMappingInput,
  UpdateCvcFormTemplateInput,
  AdminTemplateView,
} from "./cvcFormTypes";
import type { AlignmentValidationResult } from "./configValidation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function templateToResource(record: CvcFormTemplateRecord): PolicyResource {
  return {
    type: "cvc_form_template",
    id: record.id,
    status: record.status,
  };
}

function denyForbidden(reason?: string): never {
  throw new AppError("FORBIDDEN", reason ?? "Access denied.");
}

async function loadOrThrow(
  supabase: SupabaseClient,
  id: string,
): Promise<CvcFormTemplateRecord> {
  const record = await getCvcFormTemplateById(supabase, id);
  if (!record) throw new AppError("NOT_FOUND", "CVC form template not found.");
  return record;
}

async function buildAdminView(
  supabase: SupabaseClient,
  template: CvcFormTemplateRecord,
): Promise<AdminTemplateView> {
  const [fields, mappings] = await Promise.all([
    getCvcFormFieldsByTemplateId(supabase, template.id),
    getAlignmentMappingsByTemplateId(supabase, template.id),
  ]);
  return serializeForAdmin(template, fields, mappings);
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createCvcFormTemplate(
  ctx: AuthContext,
  input: CreateCvcFormTemplateInput,
  supabase: SupabaseClient,
): Promise<AdminTemplateView> {
  const actor = buildActor(ctx);
  const decision = await can("cvc_template:create", actor, {
    type: "cvc_form_template",
    id: null,
    status: "draft",
  });
  if (!decision.allowed) denyForbidden(decision.message);

  const maxVersion = await getMaxVersionNumberForState(supabase, input.state_code);
  const record = await insertCvcFormTemplate(supabase, {
    ...input,
    version_number: maxVersion + 1,
    created_by: ctx.userId,
  });

  void logEvent({
    ctx,
    action: "workflow.state_transition",
    resourceType: "cvc_form_template",
    resourceId: record.id,
    severity: "info",
    metadata: {
      action_subtype: "cvc_template.created",
      state_code: record.state_code,
      version_number: record.version_number,
    },
  });

  return buildAdminView(supabase, record);
}

export async function updateCvcFormTemplate(
  ctx: AuthContext,
  templateId: string,
  patch: UpdateCvcFormTemplateInput,
  supabase: SupabaseClient,
): Promise<AdminTemplateView> {
  const record = await loadOrThrow(supabase, templateId);
  if (record.status !== "draft") {
    throw new AppError(
      "VALIDATION_ERROR",
      "CVC form templates can only be edited while in draft status.",
    );
  }
  const actor = buildActor(ctx);
  const decision = await can("cvc_template:update", actor, templateToResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const updated = await updateCvcFormTemplateFields(supabase, templateId, patch);
  void logEvent({
    ctx,
    action: "workflow.state_transition",
    resourceType: "cvc_form_template",
    resourceId: updated.id,
    severity: "info",
    metadata: { action_subtype: "cvc_template.updated", state_code: updated.state_code },
  });
  return buildAdminView(supabase, updated);
}

export async function activateCvcFormTemplate(
  ctx: AuthContext,
  templateId: string,
  supabase: SupabaseClient,
): Promise<AdminTemplateView> {
  const record = await loadOrThrow(supabase, templateId);
  // Validation gate FIRST — before policy, before transition.
  const [fields, mappings] = await Promise.all([
    getCvcFormFieldsByTemplateId(supabase, templateId),
    getAlignmentMappingsByTemplateId(supabase, templateId),
  ]);
  const validation = validateFormAlignmentCompleteness(fields, mappings);
  if (!validation.valid) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Cannot activate: required fields missing alignment: ${validation.missingFields.join(", ")}`,
      { missingFields: validation.missingFields },
    );
  }

  const actor = buildActor(ctx);
  const decision = await can("cvc_template:activate", actor, templateToResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const result = await transition(
    {
      entityType: "cvc_form_template_status",
      entityId: record.id,
      fromState: record.status,
      toState: "active",
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      tenantId: undefined,
      metadata: {
        state_code: record.state_code,
        version_number: record.version_number,
      },
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError("FORBIDDEN", `Transition failed: ${result.reason}`, {
      reason: result.reason,
    });
  }

  const updated = await updateCvcFormTemplateStatus(supabase, templateId, "active", {
    published_at: new Date().toISOString(),
  });

  // Invalidation hook — fires on every activation
  await invalidateWorkflowDerivedData(updated.state_code, updated.id);

  // Trust signal — emit if a tenant context is available; CVC templates are
  // platform-wide so we use the audit log as the canonical record.
  void emitSignal(
    {
      orgId: "platform",
      signalType: "cvc_template_activated",
      value: 1,
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      idempotencyKey: `cvc_template_activated:${updated.id}`,
      metadata: {
        state_code: updated.state_code,
        version_number: updated.version_number,
      },
    },
    supabase,
  );

  void logEvent({
    ctx,
    action: "workflow.state_transition",
    resourceType: "cvc_form_template",
    resourceId: updated.id,
    severity: "info",
    metadata: {
      action_subtype: "cvc_template.activated",
      state_code: updated.state_code,
      version_number: updated.version_number,
    },
  });

  return buildAdminView(supabase, updated);
}

export async function deprecateCvcFormTemplate(
  ctx: AuthContext,
  templateId: string,
  supabase: SupabaseClient,
): Promise<AdminTemplateView> {
  const record = await loadOrThrow(supabase, templateId);
  const actor = buildActor(ctx);
  const decision = await can("cvc_template:deprecate", actor, templateToResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const result = await transition(
    {
      entityType: "cvc_form_template_status",
      entityId: record.id,
      fromState: record.status,
      toState: "deprecated",
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      tenantId: undefined,
      metadata: {
        state_code: record.state_code,
        version_number: record.version_number,
      },
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError("FORBIDDEN", `Transition failed: ${result.reason}`, {
      reason: result.reason,
    });
  }

  const updated = await updateCvcFormTemplateStatus(supabase, templateId, "deprecated", {
    deprecated_at: new Date().toISOString(),
  });

  await invalidateWorkflowDerivedData(updated.state_code, updated.id);

  void emitSignal(
    {
      orgId: "platform",
      signalType: "cvc_template_deprecated",
      value: 1,
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      idempotencyKey: `cvc_template_deprecated:${updated.id}`,
      metadata: {
        state_code: updated.state_code,
        version_number: updated.version_number,
      },
    },
    supabase,
  );

  void logEvent({
    ctx,
    action: "workflow.state_transition",
    resourceType: "cvc_form_template",
    resourceId: updated.id,
    severity: "info",
    metadata: {
      action_subtype: "cvc_template.deprecated",
      state_code: updated.state_code,
      version_number: updated.version_number,
    },
  });

  return buildAdminView(supabase, updated);
}

// ---------------------------------------------------------------------------
// Field + mapping management
// ---------------------------------------------------------------------------

export async function createCvcFormField(
  ctx: AuthContext,
  templateId: string,
  field: CreateCvcFormFieldInput,
  supabase: SupabaseClient,
): Promise<{ id: string }> {
  const record = await loadOrThrow(supabase, templateId);
  if (record.status !== "draft") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Fields can only be added to a draft CVC form template.",
    );
  }
  const actor = buildActor(ctx);
  const decision = await can("cvc_template:map_fields", actor, templateToResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const inserted = await insertCvcFormField(supabase, templateId, field);
  return { id: inserted.id };
}

export async function createFormAlignmentMapping(
  ctx: AuthContext,
  templateId: string,
  mapping: CreateFormAlignmentMappingInput,
  supabase: SupabaseClient,
): Promise<{ id: string }> {
  const record = await loadOrThrow(supabase, templateId);
  if (record.status !== "draft") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Mappings can only be added to a draft CVC form template.",
    );
  }
  const actor = buildActor(ctx);
  const decision = await can("cvc_template:map_fields", actor, templateToResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const inserted = await insertFormAlignmentMapping(supabase, templateId, mapping);
  return { id: inserted.id };
}

// ---------------------------------------------------------------------------
// Validation (preview)
// ---------------------------------------------------------------------------

export async function validateAlignment(
  ctx: AuthContext,
  templateId: string,
  supabase: SupabaseClient,
): Promise<AlignmentValidationResult> {
  const record = await loadOrThrow(supabase, templateId);
  const actor = buildActor(ctx);
  const decision = await can(
    "cvc_template:validate_alignment",
    actor,
    templateToResource(record),
  );
  if (!decision.allowed) denyForbidden(decision.message);

  const [fields, mappings] = await Promise.all([
    getCvcFormFieldsByTemplateId(supabase, templateId),
    getAlignmentMappingsByTemplateId(supabase, templateId),
  ]);
  return validateFormAlignmentCompleteness(fields, mappings);
}

// ---------------------------------------------------------------------------
// Read paths
// ---------------------------------------------------------------------------

export async function getCvcFormTemplate(
  ctx: AuthContext,
  templateId: string,
  supabase: SupabaseClient,
): Promise<AdminTemplateView> {
  const record = await loadOrThrow(supabase, templateId);
  const actor = buildActor(ctx);
  const decision = await can("cvc_template:view", actor, templateToResource(record));
  if (!decision.allowed) denyForbidden(decision.message);
  return buildAdminView(supabase, record);
}

export async function listCvcFormTemplatesAdmin(
  ctx: AuthContext,
  filters: { stateCode?: "IL" | "IN"; status?: CvcFormTemplateStatus },
  supabase: SupabaseClient,
): Promise<AdminTemplateView[]> {
  const actor = buildActor(ctx);
  const decision = await can("cvc_template:list", actor, {
    type: "cvc_form_template",
    id: null,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  const records = await listCvcFormTemplates(supabase, filters);
  return Promise.all(records.map((r) => buildAdminView(supabase, r)));
}
