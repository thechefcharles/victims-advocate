/**
 * Domain 2.2 — State Workflows: runtime resolvers.
 *
 * Read-only functions consumed by other domains. This is the central place
 * where downstream services (Domain 2.1 Intake, Domain 2.3 CVC Alignment,
 * Domain 6.2 Agency Reporting) ask "what does the active config say about X
 * for state Y?" or "what does the version-specific config say about X for
 * historical record Y?".
 *
 * resolveActiveIntakeSchema() — the function Domain 2.1 was promised but
 * never built. Now it exists.
 *
 * Caller authentication is the responsibility of the caller. Resolvers
 * never call can() — they assume the caller has already done it. The active
 * config is platform-wide and not tenant-scoped.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getActiveConfigByStateCode,
  getConfigById,
  getIntakeSchemaByConfigId,
  getEligibilityRuleSetByConfigId,
  getDocumentRequirementSetByConfigId,
  listTranslationMappingSetsByConfigId,
  getOutputMappingSetByConfigId,
  getFormTemplateSetByConfigId,
} from "./stateWorkflowRepository";
import type {
  StateWorkflowConfigRecord,
  IntakeSchemaRecord,
  EligibilityRuleSetRecord,
  DocumentRequirementSetRecord,
  TranslationMappingSetRecord,
  OutputMappingSetRecord,
  FormTemplateSetRecord,
} from "./stateWorkflowTypes";

// ---------------------------------------------------------------------------
// Internal helper: pick config by version OR fall back to active for state
// ---------------------------------------------------------------------------

async function resolveConfig(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
  configId?: string | null,
): Promise<StateWorkflowConfigRecord | null> {
  if (configId) {
    const byId = await getConfigById(supabase, configId);
    if (byId && byId.state_code === stateCode) return byId;
    // Caller asked for a specific version that does not exist or is for the
    // wrong state — fall through to active resolution rather than returning
    // a mismatched record.
  }
  return getActiveConfigByStateCode(supabase, stateCode);
}

// ---------------------------------------------------------------------------
// Active config
// ---------------------------------------------------------------------------

export async function resolveActiveStateWorkflowConfig(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
): Promise<StateWorkflowConfigRecord | null> {
  return getActiveConfigByStateCode(supabase, stateCode);
}

// ---------------------------------------------------------------------------
// Intake schema (the missing 2.1 function)
// ---------------------------------------------------------------------------

export async function resolveActiveIntakeSchema(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
): Promise<IntakeSchemaRecord | null> {
  const config = await getActiveConfigByStateCode(supabase, stateCode);
  if (!config) return null;
  return getIntakeSchemaByConfigId(supabase, config.id);
}

export async function resolveIntakeSchema(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
  configId?: string | null,
): Promise<IntakeSchemaRecord | null> {
  const config = await resolveConfig(supabase, stateCode, configId);
  if (!config) return null;
  return getIntakeSchemaByConfigId(supabase, config.id);
}

// ---------------------------------------------------------------------------
// Eligibility rules
// ---------------------------------------------------------------------------

export async function resolveEligibilityRuleSet(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
  configId?: string | null,
): Promise<EligibilityRuleSetRecord | null> {
  const config = await resolveConfig(supabase, stateCode, configId);
  if (!config) return null;
  return getEligibilityRuleSetByConfigId(supabase, config.id);
}

// ---------------------------------------------------------------------------
// Document requirements
// ---------------------------------------------------------------------------

export async function resolveDocumentRequirementSet(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
  configId?: string | null,
): Promise<DocumentRequirementSetRecord | null> {
  const config = await resolveConfig(supabase, stateCode, configId);
  if (!config) return null;
  return getDocumentRequirementSetByConfigId(supabase, config.id);
}

// ---------------------------------------------------------------------------
// Translation mappings (locale-aware)
// ---------------------------------------------------------------------------

export async function resolveTranslationMappingSet(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
  configId?: string | null,
  locale?: string,
): Promise<TranslationMappingSetRecord | null> {
  const config = await resolveConfig(supabase, stateCode, configId);
  if (!config) return null;
  const sets = await listTranslationMappingSetsByConfigId(supabase, config.id);
  if (sets.length === 0) return null;
  if (!locale) return sets[0] ?? null;
  return sets.find((s) => s.locale === locale) ?? null;
}

// ---------------------------------------------------------------------------
// Output mapping (PDF field metadata)
// ---------------------------------------------------------------------------

export async function resolveOutputMappingSet(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
  configId?: string | null,
): Promise<OutputMappingSetRecord | null> {
  const config = await resolveConfig(supabase, stateCode, configId);
  if (!config) return null;
  return getOutputMappingSetByConfigId(supabase, config.id);
}

// ---------------------------------------------------------------------------
// Form template (UI-renderable field metadata)
// ---------------------------------------------------------------------------

export async function resolveFormTemplateSet(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
  configId?: string | null,
): Promise<FormTemplateSetRecord | null> {
  const config = await resolveConfig(supabase, stateCode, configId);
  if (!config) return null;
  return getFormTemplateSetByConfigId(supabase, config.id);
}

// ---------------------------------------------------------------------------
// Version context for an existing workflow record
// ---------------------------------------------------------------------------

/**
 * Given any workflow-linked record (intake_session, intake_submission, case,
 * support_request) that carries a state_workflow_config_id, return the
 * full config it is bound to. Returns null if the record has no FK or
 * the FK is dangling.
 */
export async function resolveVersionContextForWorkflow(
  supabase: SupabaseClient,
  workflowRecord: { state_workflow_config_id?: string | null },
): Promise<StateWorkflowConfigRecord | null> {
  if (!workflowRecord.state_workflow_config_id) return null;
  return getConfigById(supabase, workflowRecord.state_workflow_config_id);
}
