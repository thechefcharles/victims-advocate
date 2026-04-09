/**
 * Domain 2.4: Translation / i18n — data access layer.
 *
 * Pure DB I/O. No business logic. No serialization. No policy checks.
 *
 * HARD RULE: insertExplanationRequest only accepts source_text_hash +
 * source_text_length. There is NO source_text parameter. The raw text
 * never reaches the DB.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TranslationMappingSetRecordV2,
  TranslationMappingRecord,
  LocalePreferenceRecord,
  ExplanationRequestRecord,
  TranslationMappingSetStatus,
  ExplanationRequestStatus,
  CreateTranslationMappingSetInput,
  CreateTranslationMappingInput,
  LocaleCode,
} from "./translationTypes";

const TMS_V2_TABLE = "translation_mapping_sets_v2" as const;
const TM_TABLE = "translation_mappings" as const;
const LP_TABLE = "locale_preferences" as const;
const ER_TABLE = "explanation_requests" as const;

// ---------------------------------------------------------------------------
// Translation mapping sets
// ---------------------------------------------------------------------------

export async function getActiveMappingSet(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
  locale: LocaleCode = "es",
): Promise<TranslationMappingSetRecordV2 | null> {
  const { data, error } = await supabase
    .from(TMS_V2_TABLE)
    .select("*")
    .eq("state_code", stateCode)
    .eq("locale", locale)
    .eq("status", "active")
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getActiveMappingSet: ${error.message}`);
  return (data as TranslationMappingSetRecordV2 | null) ?? null;
}

export async function getMappingSetById(
  supabase: SupabaseClient,
  id: string,
): Promise<TranslationMappingSetRecordV2 | null> {
  const { data, error } = await supabase
    .from(TMS_V2_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getMappingSetById: ${error.message}`);
  return (data as TranslationMappingSetRecordV2 | null) ?? null;
}

export async function listMappingSets(
  supabase: SupabaseClient,
  filters: {
    stateCode?: "IL" | "IN";
    locale?: LocaleCode;
    status?: TranslationMappingSetStatus;
  } = {},
): Promise<TranslationMappingSetRecordV2[]> {
  let query = supabase
    .from(TMS_V2_TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (filters.stateCode) query = query.eq("state_code", filters.stateCode);
  if (filters.locale) query = query.eq("locale", filters.locale);
  if (filters.status) query = query.eq("status", filters.status);
  const { data, error } = await query;
  if (error) throw new Error(`listMappingSets: ${error.message}`);
  return (data as TranslationMappingSetRecordV2[]) ?? [];
}

export async function getMaxMappingSetVersionNumber(
  supabase: SupabaseClient,
  stateCode: "IL" | "IN",
  locale: LocaleCode,
): Promise<number> {
  const { data, error } = await supabase
    .from(TMS_V2_TABLE)
    .select("version_number")
    .eq("state_code", stateCode)
    .eq("locale", locale)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getMaxMappingSetVersionNumber: ${error.message}`);
  return (data as { version_number: number } | null)?.version_number ?? 0;
}

export async function insertMappingSet(
  supabase: SupabaseClient,
  input: CreateTranslationMappingSetInput & {
    created_by: string | null;
    version_number: number;
  },
): Promise<TranslationMappingSetRecordV2> {
  const { data, error } = await supabase
    .from(TMS_V2_TABLE)
    .insert({
      state_code: input.state_code,
      locale: input.locale,
      display_name: input.display_name,
      version_number: input.version_number,
      status: "draft",
      state_workflow_config_id: input.state_workflow_config_id ?? null,
      created_by: input.created_by,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`insertMappingSet: ${error?.message ?? "no row"}`);
  return data as TranslationMappingSetRecordV2;
}

export async function updateMappingSetStatus(
  supabase: SupabaseClient,
  id: string,
  status: TranslationMappingSetStatus,
  patch?: { published_at?: string | null; deprecated_at?: string | null },
): Promise<TranslationMappingSetRecordV2> {
  const { data, error } = await supabase
    .from(TMS_V2_TABLE)
    .update({
      status,
      ...(patch?.published_at !== undefined ? { published_at: patch.published_at } : {}),
      ...(patch?.deprecated_at !== undefined ? { deprecated_at: patch.deprecated_at } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new Error(`updateMappingSetStatus: ${error?.message ?? "no row"}`);
  return data as TranslationMappingSetRecordV2;
}

// ---------------------------------------------------------------------------
// Individual translation mappings
// ---------------------------------------------------------------------------

export async function insertTranslationMapping(
  supabase: SupabaseClient,
  mappingSetId: string,
  input: CreateTranslationMappingInput,
): Promise<TranslationMappingRecord> {
  const { data, error } = await supabase
    .from(TM_TABLE)
    .insert({
      mapping_set_id: mappingSetId,
      source_value: input.source_value,
      canonical_value: input.canonical_value,
      field_context: input.field_context ?? null,
      locale: input.locale ?? "es",
      transform_type: input.transform_type ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`insertTranslationMapping: ${error?.message ?? "no row"}`);
  return data as TranslationMappingRecord;
}

export async function getMappingsBySetId(
  supabase: SupabaseClient,
  mappingSetId: string,
): Promise<TranslationMappingRecord[]> {
  const { data, error } = await supabase
    .from(TM_TABLE)
    .select("*")
    .eq("mapping_set_id", mappingSetId);
  if (error) throw new Error(`getMappingsBySetId: ${error.message}`);
  return (data as TranslationMappingRecord[]) ?? [];
}

// ---------------------------------------------------------------------------
// Locale preferences
// ---------------------------------------------------------------------------

export async function getLocalePreference(
  supabase: SupabaseClient,
  userId: string,
): Promise<LocalePreferenceRecord | null> {
  const { data, error } = await supabase
    .from(LP_TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`getLocalePreference: ${error.message}`);
  return (data as LocalePreferenceRecord | null) ?? null;
}

export async function upsertLocalePreference(
  supabase: SupabaseClient,
  userId: string,
  locale: LocaleCode,
): Promise<LocalePreferenceRecord> {
  const { data, error } = await supabase
    .from(LP_TABLE)
    .upsert(
      {
        user_id: userId,
        locale,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();
  if (error || !data) throw new Error(`upsertLocalePreference: ${error?.message ?? "no row"}`);
  return data as LocalePreferenceRecord;
}

// ---------------------------------------------------------------------------
// Explanation requests — HASH ONLY, never raw text
// ---------------------------------------------------------------------------

export async function insertExplanationRequest(
  supabase: SupabaseClient,
  input: {
    user_id: string | null;
    workflow_key: string;
    context_type: string;
    field_key: string | null;
    state_code: string | null;
    source_text_hash: string;
    source_text_length: number;
    model: string | null;
  },
): Promise<ExplanationRequestRecord> {
  // Sanity check: this function deliberately does NOT accept a source_text
  // parameter. If a caller tries to pass one, TypeScript will reject the
  // extra property; even at runtime there is no path that lets raw text
  // reach the DB.
  const { data, error } = await supabase
    .from(ER_TABLE)
    .insert({
      user_id: input.user_id,
      workflow_key: input.workflow_key,
      context_type: input.context_type,
      field_key: input.field_key,
      state_code: input.state_code,
      source_text_hash: input.source_text_hash,
      source_text_length: input.source_text_length,
      model: input.model,
      status: "pending",
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`insertExplanationRequest: ${error?.message ?? "no row"}`);
  return data as ExplanationRequestRecord;
}

export async function updateExplanationRequest(
  supabase: SupabaseClient,
  id: string,
  patch: {
    status: ExplanationRequestStatus;
    explanation_text?: string | null;
    disclaimer?: string | null;
    failure_reason?: string | null;
    completed_at?: string | null;
  },
): Promise<ExplanationRequestRecord> {
  const { data, error } = await supabase
    .from(ER_TABLE)
    .update({
      status: patch.status,
      ...(patch.explanation_text !== undefined ? { explanation_text: patch.explanation_text } : {}),
      ...(patch.disclaimer !== undefined ? { disclaimer: patch.disclaimer } : {}),
      ...(patch.failure_reason !== undefined ? { failure_reason: patch.failure_reason } : {}),
      ...(patch.completed_at !== undefined ? { completed_at: patch.completed_at } : {}),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new Error(`updateExplanationRequest: ${error?.message ?? "no row"}`);
  return data as ExplanationRequestRecord;
}

export async function listExplanationRequests(
  supabase: SupabaseClient,
  filters: { userId?: string; status?: ExplanationRequestStatus; limit?: number } = {},
): Promise<ExplanationRequestRecord[]> {
  let query = supabase
    .from(ER_TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (filters.userId) query = query.eq("user_id", filters.userId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.limit) query = query.limit(filters.limit);
  const { data, error } = await query;
  if (error) throw new Error(`listExplanationRequests: ${error.message}`);
  return (data as ExplanationRequestRecord[]) ?? [];
}
