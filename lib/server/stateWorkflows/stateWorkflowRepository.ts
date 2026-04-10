/**
 * Domain 2.2 — State Workflows: data access layer.
 *
 * Pure DB I/O. No business logic. No serialization. No policy checks.
 *
 * Data class: Class C — Controlled Business.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  StateWorkflowConfigRecord,
  IntakeSchemaRecord,
  EligibilityRuleSetRecord,
  DocumentRequirementSetRecord,
  TranslationMappingSetRecord,
  OutputMappingSetRecord,
  FormTemplateSetRecord,
  DisclaimerSetRecord,
  StateWorkflowConfigWithSets,
  StateWorkflowConfigStatus,
  CreateStateWorkflowConfigInput,
  UpdateStateWorkflowConfigInput,
  FormFieldMetadata,
} from "./stateWorkflowTypes";

const CONFIGS_TABLE = "state_workflow_configs" as const;
const INTAKE_SCHEMAS_TABLE = "intake_schemas" as const;
const ELIGIBILITY_TABLE = "eligibility_rule_sets" as const;
const DOC_REQ_TABLE = "document_requirement_sets" as const;
const TRANSLATION_TABLE = "translation_mapping_sets" as const;
const OUTPUT_TABLE = "output_mapping_sets" as const;
const FORM_TEMPLATE_TABLE = "form_template_sets" as const;
const DISCLAIMER_TABLE = "disclaimer_sets" as const;

// ---------------------------------------------------------------------------
// Configs — read
// ---------------------------------------------------------------------------

export async function getConfigById(
  supabase: SupabaseClient,
  id: string,
): Promise<StateWorkflowConfigRecord | null> {
  const { data, error } = await supabase
    .from(CONFIGS_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getConfigById: ${error.message}`);
  return (data as StateWorkflowConfigRecord | null) ?? null;
}

export async function getActiveConfigByStateCode(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
): Promise<StateWorkflowConfigRecord | null> {
  const { data, error } = await supabase
    .from(CONFIGS_TABLE)
    .select("*")
    .eq("state_code", stateCode)
    .eq("status", "active")
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getActiveConfigByStateCode: ${error.message}`);
  return (data as StateWorkflowConfigRecord | null) ?? null;
}

export async function getMaxVersionForState(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
): Promise<number> {
  const { data, error } = await supabase
    .from(CONFIGS_TABLE)
    .select("version_number")
    .eq("state_code", stateCode)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getMaxVersionForState: ${error.message}`);
  return (data as { version_number: number } | null)?.version_number ?? 0;
}

export async function listConfigs(
  supabase: SupabaseClient,
  filters: { stateCode?: "IL" | "IN"; status?: StateWorkflowConfigStatus } = {},
): Promise<StateWorkflowConfigRecord[]> {
  let query = supabase
    .from(CONFIGS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.stateCode) query = query.eq("state_code", filters.stateCode);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(`listConfigs: ${error.message}`);
  return (data as StateWorkflowConfigRecord[]) ?? [];
}

export async function getConfigWithSets(
  supabase: SupabaseClient,
  id: string,
): Promise<StateWorkflowConfigWithSets | null> {
  const config = await getConfigById(supabase, id);
  if (!config) return null;

  const [intakeSchema, eligibilitySet, docReqSet, translationSets, outputSet, formSet, disclaimerSet] =
    await Promise.all([
      getIntakeSchemaByConfigId(supabase, id),
      getEligibilityRuleSetByConfigId(supabase, id),
      getDocumentRequirementSetByConfigId(supabase, id),
      listTranslationMappingSetsByConfigId(supabase, id),
      getOutputMappingSetByConfigId(supabase, id),
      getFormTemplateSetByConfigId(supabase, id),
      getDisclaimerSetByConfigId(supabase, id),
    ]);

  return {
    config,
    intake_schema: intakeSchema,
    eligibility_rule_set: eligibilitySet,
    document_requirement_set: docReqSet,
    translation_mapping_sets: translationSets,
    output_mapping_set: outputSet,
    form_template_set: formSet,
    disclaimer_set: disclaimerSet,
  };
}

// ---------------------------------------------------------------------------
// Configs — write
// ---------------------------------------------------------------------------

export async function insertConfig(
  supabase: SupabaseClient,
  input: CreateStateWorkflowConfigInput & { created_by: string | null; version_number: number },
): Promise<StateWorkflowConfigRecord> {
  const { data, error } = await supabase
    .from(CONFIGS_TABLE)
    .insert({
      state_code: input.state_code,
      display_name: input.display_name,
      seeded_from: input.seeded_from ?? null,
      version_number: input.version_number,
      status: "draft",
      created_by: input.created_by,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`insertConfig: ${error?.message ?? "no row returned"}`);
  return data as StateWorkflowConfigRecord;
}

export async function updateConfigStatus(
  supabase: SupabaseClient,
  id: string,
  status: StateWorkflowConfigStatus,
  patch?: { published_at?: string | null; deprecated_at?: string | null },
): Promise<StateWorkflowConfigRecord> {
  const { data, error } = await supabase
    .from(CONFIGS_TABLE)
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
    throw new Error(`updateConfigStatus: ${error?.message ?? "no row returned"}`);
  return data as StateWorkflowConfigRecord;
}

export async function updateConfigFields(
  supabase: SupabaseClient,
  id: string,
  patch: UpdateStateWorkflowConfigInput,
): Promise<StateWorkflowConfigRecord> {
  const { data, error } = await supabase
    .from(CONFIGS_TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data)
    throw new Error(`updateConfigFields: ${error?.message ?? "no row returned"}`);
  return data as StateWorkflowConfigRecord;
}

// ---------------------------------------------------------------------------
// Child sets — readers
// ---------------------------------------------------------------------------

export async function getIntakeSchemaByConfigId(
  supabase: SupabaseClient,
  configId: string,
): Promise<IntakeSchemaRecord | null> {
  const { data, error } = await supabase
    .from(INTAKE_SCHEMAS_TABLE)
    .select("*")
    .eq("config_id", configId)
    .maybeSingle();
  if (error) throw new Error(`getIntakeSchemaByConfigId: ${error.message}`);
  return (data as IntakeSchemaRecord | null) ?? null;
}

export async function getEligibilityRuleSetByConfigId(
  supabase: SupabaseClient,
  configId: string,
): Promise<EligibilityRuleSetRecord | null> {
  const { data, error } = await supabase
    .from(ELIGIBILITY_TABLE)
    .select("*")
    .eq("config_id", configId)
    .maybeSingle();
  if (error) throw new Error(`getEligibilityRuleSetByConfigId: ${error.message}`);
  return (data as EligibilityRuleSetRecord | null) ?? null;
}

export async function getDocumentRequirementSetByConfigId(
  supabase: SupabaseClient,
  configId: string,
): Promise<DocumentRequirementSetRecord | null> {
  const { data, error } = await supabase
    .from(DOC_REQ_TABLE)
    .select("*")
    .eq("config_id", configId)
    .maybeSingle();
  if (error) throw new Error(`getDocumentRequirementSetByConfigId: ${error.message}`);
  return (data as DocumentRequirementSetRecord | null) ?? null;
}

export async function listTranslationMappingSetsByConfigId(
  supabase: SupabaseClient,
  configId: string,
): Promise<TranslationMappingSetRecord[]> {
  const { data, error } = await supabase
    .from(TRANSLATION_TABLE)
    .select("*")
    .eq("config_id", configId);
  if (error) throw new Error(`listTranslationMappingSetsByConfigId: ${error.message}`);
  return (data as TranslationMappingSetRecord[]) ?? [];
}

export async function getOutputMappingSetByConfigId(
  supabase: SupabaseClient,
  configId: string,
): Promise<OutputMappingSetRecord | null> {
  const { data, error } = await supabase
    .from(OUTPUT_TABLE)
    .select("*")
    .eq("config_id", configId)
    .maybeSingle();
  if (error) throw new Error(`getOutputMappingSetByConfigId: ${error.message}`);
  return (data as OutputMappingSetRecord | null) ?? null;
}

export async function getFormTemplateSetByConfigId(
  supabase: SupabaseClient,
  configId: string,
): Promise<FormTemplateSetRecord | null> {
  const { data, error } = await supabase
    .from(FORM_TEMPLATE_TABLE)
    .select("*")
    .eq("config_id", configId)
    .maybeSingle();
  if (error) throw new Error(`getFormTemplateSetByConfigId: ${error.message}`);
  return (data as FormTemplateSetRecord | null) ?? null;
}

export async function getDisclaimerSetByConfigId(
  supabase: SupabaseClient,
  configId: string,
): Promise<DisclaimerSetRecord | null> {
  const { data, error } = await supabase
    .from(DISCLAIMER_TABLE)
    .select("*")
    .eq("config_id", configId)
    .maybeSingle();
  if (error) throw new Error(`getDisclaimerSetByConfigId: ${error.message}`);
  return (data as DisclaimerSetRecord | null) ?? null;
}

// ---------------------------------------------------------------------------
// Child sets — writers
// ---------------------------------------------------------------------------

export async function insertIntakeSchema(
  supabase: SupabaseClient,
  configId: string,
  payload: Record<string, unknown>,
): Promise<IntakeSchemaRecord> {
  const { data, error } = await supabase
    .from(INTAKE_SCHEMAS_TABLE)
    .insert({ config_id: configId, schema_payload: payload })
    .select("*")
    .single();
  if (error || !data) throw new Error(`insertIntakeSchema: ${error?.message ?? "no row"}`);
  return data as IntakeSchemaRecord;
}

export async function insertEligibilityRuleSet(
  supabase: SupabaseClient,
  configId: string,
  payload: Record<string, unknown>,
): Promise<EligibilityRuleSetRecord> {
  const { data, error } = await supabase
    .from(ELIGIBILITY_TABLE)
    .insert({ config_id: configId, rules_payload: payload })
    .select("*")
    .single();
  if (error || !data) throw new Error(`insertEligibilityRuleSet: ${error?.message ?? "no row"}`);
  return data as EligibilityRuleSetRecord;
}

export async function insertDocumentRequirementSet(
  supabase: SupabaseClient,
  configId: string,
  payload: Record<string, unknown>,
): Promise<DocumentRequirementSetRecord> {
  const { data, error } = await supabase
    .from(DOC_REQ_TABLE)
    .insert({ config_id: configId, requirements_payload: payload })
    .select("*")
    .single();
  if (error || !data)
    throw new Error(`insertDocumentRequirementSet: ${error?.message ?? "no row"}`);
  return data as DocumentRequirementSetRecord;
}

export async function insertTranslationMappingSet(
  supabase: SupabaseClient,
  configId: string,
  locale: string,
  payload: Record<string, unknown>,
): Promise<TranslationMappingSetRecord> {
  const { data, error } = await supabase
    .from(TRANSLATION_TABLE)
    .insert({ config_id: configId, locale, mappings_payload: payload })
    .select("*")
    .single();
  if (error || !data)
    throw new Error(`insertTranslationMappingSet: ${error?.message ?? "no row"}`);
  return data as TranslationMappingSetRecord;
}

export async function insertOutputMappingSet(
  supabase: SupabaseClient,
  configId: string,
  templateId: string,
  fieldMetadata: FormFieldMetadata[],
): Promise<OutputMappingSetRecord> {
  const { data, error } = await supabase
    .from(OUTPUT_TABLE)
    .insert({ config_id: configId, template_id: templateId, field_metadata: fieldMetadata })
    .select("*")
    .single();
  if (error || !data) throw new Error(`insertOutputMappingSet: ${error?.message ?? "no row"}`);
  return data as OutputMappingSetRecord;
}

export async function insertFormTemplateSet(
  supabase: SupabaseClient,
  configId: string,
  templateId: string,
  fieldMetadata: FormFieldMetadata[],
): Promise<FormTemplateSetRecord> {
  const { data, error } = await supabase
    .from(FORM_TEMPLATE_TABLE)
    .insert({ config_id: configId, template_id: templateId, field_metadata: fieldMetadata })
    .select("*")
    .single();
  if (error || !data) throw new Error(`insertFormTemplateSet: ${error?.message ?? "no row"}`);
  return data as FormTemplateSetRecord;
}

export async function insertDisclaimerSet(
  supabase: SupabaseClient,
  configId: string,
  payload: unknown[],
): Promise<DisclaimerSetRecord> {
  const { data, error } = await supabase
    .from(DISCLAIMER_TABLE)
    .insert({ config_id: configId, disclaimers_payload: payload })
    .select("*")
    .single();
  if (error || !data) throw new Error(`insertDisclaimerSet: ${error?.message ?? "no row"}`);
  return data as DisclaimerSetRecord;
}
