/**
 * Phase 10: Knowledge base retrieval – active entries only for app/AI; precedence by scope.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { KnowledgeEntryRow } from "./types";

export type GetKnowledgeByKeyParams = {
  entryKey: string;
  stateCode?: string | null;
  programKey?: string | null;
  audienceRole?: string | null;
  workflowKey?: string | null;
  /** If true, include draft/archived (admin only). */
  includeInactive?: boolean;
};

/**
 * Fetch a single entry by logical key. For non-admin, only active.
 * Precedence: exact (state + program) match → state-only → general (null state/program).
 */
export async function getKnowledgeEntryByKey(
  params: GetKnowledgeByKeyParams
): Promise<KnowledgeEntryRow | null> {
  const { entryKey, stateCode, programKey, audienceRole, workflowKey, includeInactive } = params;
  const supabase = getSupabaseAdmin();

  const base = supabase
    .from("knowledge_entries")
    .select("*")
    .eq("entry_key", entryKey);

  const q = includeInactive ? base : base.eq("is_active", true);

  const { data: rows, error } = await q.order("updated_at", { ascending: false });

  if (error || !rows?.length) return null;

  const candidates = rows as KnowledgeEntryRow[];

  const withAudience = audienceRole
    ? candidates.filter((r) => !r.audience_role || r.audience_role === audienceRole)
    : candidates;
  const withWorkflow = workflowKey
    ? withAudience.filter((r) => !r.workflow_key || r.workflow_key === workflowKey)
    : withAudience;

  const preferExact =
    stateCode && programKey
      ? withWorkflow.find((r) => r.state_code === stateCode && r.program_key === programKey)
      : null;
  if (preferExact) return preferExact;

  const preferState = stateCode
    ? withWorkflow.find((r) => r.state_code === stateCode && !r.program_key)
    : null;
  if (preferState) return preferState;

  const general = withWorkflow.find((r) => !r.state_code && !r.program_key);
  return general ?? withWorkflow[0] ?? null;
}

export type SearchKnowledgeParams = {
  query?: string | null;
  category?: string | null;
  stateCode?: string | null;
  programKey?: string | null;
  workflowKey?: string | null;
  audienceRole?: string | null;
  /** Admin only */
  includeInactive?: boolean;
  limit?: number;
};

/**
 * Search entries. For non-admin, only active. Simple ilike on title/body and filters.
 */
export async function searchKnowledgeEntries(
  params: SearchKnowledgeParams
): Promise<KnowledgeEntryRow[]> {
  const {
    query,
    category,
    stateCode,
    programKey,
    workflowKey,
    audienceRole,
    includeInactive,
    limit = 50,
  } = params;
  const supabase = getSupabaseAdmin();

  let q = supabase.from("knowledge_entries").select("*");

  if (!includeInactive) q = q.eq("is_active", true);

  if (category) q = q.eq("category", category);
  if (stateCode != null) q = q.eq("state_code", stateCode);
  if (programKey != null) q = q.eq("program_key", programKey);
  if (workflowKey != null) q = q.eq("workflow_key", workflowKey);
  if (audienceRole != null) q = q.or(`audience_role.is.null,audience_role.eq.${audienceRole}`);

  if (query?.trim()) {
    const term = `%${query.trim().replace(/%/g, "\\%")}%`;
    q = q.or(`title.ilike.${term},body.ilike.${term}`);
  }

  const { data, error } = await q.order("updated_at", { ascending: false }).limit(limit);

  if (error) return [];
  return (data ?? []) as KnowledgeEntryRow[];
}

export type GetKnowledgeForContextParams = {
  category: string;
  stateCode?: string | null;
  programKey?: string | null;
  audienceRole?: string | null;
  workflowKey?: string | null;
  limit?: number;
};

/**
 * Get entries for a given context (e.g. eligibility for IL compensation_intake).
 * Returns active entries only; prefers state+program, then state, then general.
 */
export async function getKnowledgeEntriesForContext(
  params: GetKnowledgeForContextParams
): Promise<KnowledgeEntryRow[]> {
  const { category, stateCode, programKey, audienceRole, workflowKey, limit = 10 } = params;
  const supabase = getSupabaseAdmin();

  let q = supabase
    .from("knowledge_entries")
    .select("*")
    .eq("is_active", true)
    .eq("category", category);

  if (workflowKey != null) q = q.or(`workflow_key.is.null,workflow_key.eq.${workflowKey}`);
  if (audienceRole != null) q = q.or(`audience_role.is.null,audience_role.eq.${audienceRole}`);

  const { data, error } = await q.order("updated_at", { ascending: false }).limit(limit * 2);

  if (error || !data?.length) return [];

  const rows = data as KnowledgeEntryRow[];

  const byScope = (r: KnowledgeEntryRow) => {
    if (stateCode && programKey && r.state_code === stateCode && r.program_key === programKey)
      return 3;
    if (stateCode && r.state_code === stateCode && !r.program_key) return 2;
    if (!r.state_code && !r.program_key) return 1;
    return 0;
  };

  const sorted = [...rows].sort((a, b) => byScope(b) - byScope(a));
  return sorted.slice(0, limit);
}

/**
 * Fetch entries that might ground an explain request: by category + state/program/workflow/field hint.
 * Used by translator to inject authoritative context.
 */
export async function getKnowledgeForExplain(params: {
  stateCode?: string | null;
  programKey?: string | null;
  workflowKey?: string | null;
  fieldKey?: string | null;
  contextType?: string | null;
  limit?: number;
}): Promise<KnowledgeEntryRow[]> {
  const { stateCode, programKey, workflowKey, fieldKey, contextType, limit = 5 } = params;

  const categories: string[] = ["definitions", "eligibility", "program_overview", "documents", "timeline"];
  if (contextType === "form_label" || fieldKey?.includes("certification")) {
    categories.unshift("definitions", "rights");
  }

  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("knowledge_entries")
    .select("*")
    .eq("is_active", true)
    .in("category", categories);

  if (workflowKey) q = q.or(`workflow_key.is.null,workflow_key.eq.${workflowKey}`);
  if (stateCode != null) q = q.or(`state_code.is.null,state_code.eq.${stateCode}`);
  if (programKey != null) q = q.or(`program_key.is.null,program_key.eq.${programKey}`);

  const { data, error } = await q.order("updated_at", { ascending: false }).limit(limit * 2);

  if (error || !data?.length) return [];

  const rows = data as KnowledgeEntryRow[];
  const byScope = (r: KnowledgeEntryRow) => {
    if (stateCode && programKey && r.state_code === stateCode && r.program_key === programKey)
      return 3;
    if (stateCode && r.state_code === stateCode) return 2;
    return 1;
  };
  const sorted = [...rows].sort((a, b) => byScope(b) - byScope(a));
  return sorted.slice(0, limit);
}
