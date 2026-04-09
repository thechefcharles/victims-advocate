/**
 * Domain 2.4: Translation / i18n — mapping set admin service.
 *
 * Owns the lifecycle of translation_mapping_sets_v2 (draft → active → deprecated)
 * and the runtime resolver other domains use.
 *
 * normalizeStructuredPayload: implemented as a STUB returning the payload
 * unchanged. Per the Step 0 Spanish Enum Audit (zero hits), the intake UI
 * sends English enum values regardless of display language. Real normalization
 * is therefore not needed in v1; it's deferred until/unless that changes.
 * The function exists so future callers can wire it in without a signature
 * change.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { transition } from "@/lib/server/workflow/engine";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { AuthContext } from "@/lib/server/auth/context";
import type { PolicyResource } from "@/lib/server/policy/policyTypes";
import {
  getActiveMappingSet,
  getMappingSetById,
  getMaxMappingSetVersionNumber,
  insertMappingSet,
  insertTranslationMapping,
  getMappingsBySetId,
  listMappingSets,
  updateMappingSetStatus,
} from "./translationRepository";
import type {
  TranslationMappingSetRecordV2,
  TranslationMappingRecord,
  CreateTranslationMappingSetInput,
  CreateTranslationMappingInput,
  AdminMappingSetView,
  LocaleCode,
} from "./translationTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setToResource(record: TranslationMappingSetRecordV2): PolicyResource {
  return {
    type: "translation_mapping_set",
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
): Promise<TranslationMappingSetRecordV2> {
  const record = await getMappingSetById(supabase, id);
  if (!record) throw new AppError("NOT_FOUND", "Translation mapping set not found.");
  return record;
}

async function buildAdminView(
  supabase: SupabaseClient,
  set: TranslationMappingSetRecordV2,
): Promise<AdminMappingSetView> {
  const mappings = await getMappingsBySetId(supabase, set.id);
  return {
    id: set.id,
    state_code: set.state_code,
    locale: set.locale,
    status: set.status,
    version_number: set.version_number,
    display_name: set.display_name,
    published_at: set.published_at,
    deprecated_at: set.deprecated_at,
    created_by: set.created_by,
    created_at: set.created_at,
    mapping_count: mappings.length,
  };
}

// ---------------------------------------------------------------------------
// Runtime resolver (no actor — read-only, called by other domains)
// ---------------------------------------------------------------------------

export async function resolveActiveTranslationMappingSet(
  stateCode: "IL" | "IN",
  supabase: SupabaseClient,
  locale: LocaleCode = "es",
): Promise<TranslationMappingSetRecordV2 | null> {
  return getActiveMappingSet(supabase, stateCode, locale);
}

// ---------------------------------------------------------------------------
// Admin actions
// ---------------------------------------------------------------------------

export async function getActiveMappingSetForAdmin(
  ctx: AuthContext,
  stateCode: "IL" | "IN",
  supabase: SupabaseClient,
): Promise<AdminMappingSetView | null> {
  const actor = buildActor(ctx);
  const decision = await can("translation_mapping_set:view", actor, {
    type: "translation_mapping_set",
    id: null,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  const set = await getActiveMappingSet(supabase, stateCode);
  if (!set) return null;
  return buildAdminView(supabase, set);
}

export async function listTranslationMappingSets(
  ctx: AuthContext,
  filters: { stateCode?: "IL" | "IN"; locale?: LocaleCode },
  supabase: SupabaseClient,
): Promise<AdminMappingSetView[]> {
  const actor = buildActor(ctx);
  const decision = await can("translation_mapping_set:view", actor, {
    type: "translation_mapping_set",
    id: null,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  const records = await listMappingSets(supabase, filters);
  return Promise.all(records.map((r) => buildAdminView(supabase, r)));
}

export async function createTranslationMappingSet(
  ctx: AuthContext,
  input: CreateTranslationMappingSetInput,
  supabase: SupabaseClient,
): Promise<AdminMappingSetView> {
  const actor = buildActor(ctx);
  const decision = await can("translation_mapping_set:update", actor, {
    type: "translation_mapping_set",
    id: null,
    status: "draft",
  });
  if (!decision.allowed) denyForbidden(decision.message);

  const maxVersion = await getMaxMappingSetVersionNumber(
    supabase,
    input.state_code,
    input.locale,
  );
  const record = await insertMappingSet(supabase, {
    ...input,
    version_number: maxVersion + 1,
    created_by: ctx.userId,
  });

  void logEvent({
    ctx,
    action: "workflow.state_transition",
    resourceType: "translation_mapping_set",
    resourceId: record.id,
    severity: "info",
    metadata: {
      action_subtype: "translation_mapping_set.created",
      state_code: record.state_code,
      locale: record.locale,
      version_number: record.version_number,
    },
  });

  return buildAdminView(supabase, record);
}

export async function publishTranslationMappingSet(
  ctx: AuthContext,
  setId: string,
  supabase: SupabaseClient,
): Promise<AdminMappingSetView> {
  const record = await loadOrThrow(supabase, setId);

  // Validation gate: must have at least one mapping rule before publishing.
  const mappings = await getMappingsBySetId(supabase, setId);
  if (mappings.length === 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Cannot publish a translation mapping set with zero mappings.",
    );
  }

  const actor = buildActor(ctx);
  const decision = await can(
    "translation_mapping_set:publish",
    actor,
    setToResource(record),
  );
  if (!decision.allowed) denyForbidden(decision.message);

  const result = await transition(
    {
      entityType: "translation_mapping_set_status",
      entityId: record.id,
      fromState: record.status,
      toState: "active",
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      tenantId: undefined,
      metadata: {
        state_code: record.state_code,
        locale: record.locale,
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

  const updated = await updateMappingSetStatus(supabase, setId, "active", {
    published_at: new Date().toISOString(),
  });

  void logEvent({
    ctx,
    action: "workflow.state_transition",
    resourceType: "translation_mapping_set",
    resourceId: updated.id,
    severity: "info",
    metadata: {
      action_subtype: "translation_mapping_set.published",
      state_code: updated.state_code,
      locale: updated.locale,
      version_number: updated.version_number,
    },
  });

  return buildAdminView(supabase, updated);
}

export async function addTranslationMapping(
  ctx: AuthContext,
  setId: string,
  mapping: CreateTranslationMappingInput,
  supabase: SupabaseClient,
): Promise<{ id: string }> {
  const record = await loadOrThrow(supabase, setId);
  if (record.status !== "draft") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Translation mappings can only be added to a draft set.",
    );
  }
  const actor = buildActor(ctx);
  const decision = await can(
    "translation_mapping_set:update",
    actor,
    setToResource(record),
  );
  if (!decision.allowed) denyForbidden(decision.message);

  const inserted = await insertTranslationMapping(supabase, setId, mapping);
  return { id: inserted.id };
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Pure function — no DB. Looks up source_value in mappings for the given
 * field_context. Returns the canonical value if found, otherwise the
 * unchanged source value (no-op fallback).
 *
 * Match strategy: exact_match (case-sensitive) is the default. The
 * `transform_type` column is reserved for future fuzzy/regex matching.
 */
export function resolveCanonicalValue(
  sourceValue: string,
  fieldContext: string | null,
  mappings: TranslationMappingRecord[],
): string {
  for (const m of mappings) {
    if (m.field_context !== fieldContext) continue;
    if (m.source_value === sourceValue) return m.canonical_value;
  }
  return sourceValue;
}

/**
 * Walks an intake submission payload and applies translation mappings.
 *
 * STUB IMPLEMENTATION (Domain 2.4 v1): per the Step 0 Spanish Enum Audit,
 * intake UI sends English enum values regardless of display language. There
 * is therefore no Spanish-value-in-payload normalization needed in v1. This
 * function exists so future callers can wire it in without a signature change.
 *
 * If a future audit finds Spanish enum values flowing through the intake
 * payload, this function should walk known enum field paths and apply
 * resolveCanonicalValue() to each. Until then, it is a no-op pass-through.
 */
export function normalizeStructuredPayload<T>(
  payload: T,
  _mappings: TranslationMappingRecord[],
): T {
  return payload;
}
