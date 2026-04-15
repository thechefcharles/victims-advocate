/**
 * Domain 3.4 — V2 matching: organization_match_runs persistence adapter.
 *
 * V2 produces MatchResultSet with cohort-split arrays. We persist a flat
 * row per result into the existing organization_match_runs table using
 * metadata for V2-specific fields (factors, orgTierType, engine marker).
 * getV2MatchResults re-splits by org_tier_type on read.
 */

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  MatchResult,
  MatchResultSet,
  OrgTierType,
} from "./matchingTypes";

const ENGINE_MARKER = "v2";

export interface PersistV2Params {
  caseId: string;
  scopeOrganizationId: string;
  runGroupId?: string;
  actorUserId: string | null;
  resultSet: MatchResultSet;
}

export async function persistV2MatchRun(
  params: PersistV2Params,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{ runGroupId: string; inserted: number }> {
  const runGroupId = params.runGroupId ?? randomUUID();
  const all: MatchResult[] = [...params.resultSet.grassroots, ...params.resultSet.socialService];
  if (all.length === 0) return { runGroupId, inserted: 0 };

  // Legacy columns: match_score (0..100 in the legacy engine). V2's 0..1
  // weighted sum is scaled to 0..100 for compatibility.
  const rows = all.map((r) => ({
    case_id: params.caseId,
    scope_organization_id: params.scopeOrganizationId,
    organization_id: r.organizationId,
    organization_name: "", // filled by a follow-up join; v2 doesn't yet carry it
    organization_profile_snapshot: {},
    match_input_snapshot: {},
    match_score: Math.round(r.matchScore * 10000) / 100, // 0..100 with 2 decimals
    match_tier:
      r.matchScore >= 0.66
        ? "strong_match"
        : r.matchScore >= 0.36
          ? "possible_match"
          : "limited_match",
    strong_match: r.matchScore >= 0.66,
    possible_match: r.matchScore >= 0.36 && r.matchScore < 0.66,
    limited_match: r.matchScore < 0.36,
    reasons: r.reasons,
    flags: r.isFiltered && r.filterReason ? [r.filterReason] : [],
    metadata: {
      engine: ENGINE_MARKER,
      org_tier_type: r.orgTierType,
      factors: r.factors,
      match_score_raw: r.matchScore,
    },
    run_group_id: runGroupId,
    actor_user_id: params.actorUserId,
  }));

  const { error } = await supabase.from("organization_match_runs").insert(rows);
  if (error) throw new Error(error.message);
  return { runGroupId, inserted: rows.length };
}

export interface V2MatchRunResults {
  runGroupId: string | null;
  createdAt: string | null;
  grassroots: MatchResult[];
  socialService: MatchResult[];
}

export async function getV2MatchResults(
  caseId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<V2MatchRunResults> {
  const { data: latest } = await supabase
    .from("organization_match_runs")
    .select("run_group_id, created_at, organization_id, reasons, metadata")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (latest ?? []) as Array<{
    run_group_id: string;
    created_at: string;
    organization_id: string;
    reasons: string[] | null;
    metadata: Record<string, unknown> | null;
  }>;
  if (rows.length === 0) {
    return { runGroupId: null, createdAt: null, grassroots: [], socialService: [] };
  }

  // Latest run_group_id is the one on the first row — same created_at batch.
  const headRunId = rows[0].run_group_id;
  const headRunRows = rows.filter((r) => r.run_group_id === headRunId);

  const v2Only = headRunRows.filter((r) => {
    const meta = r.metadata ?? {};
    return (meta as { engine?: string }).engine === ENGINE_MARKER;
  });

  const toResult = (r: (typeof headRunRows)[number]): MatchResult => {
    const meta = (r.metadata ?? {}) as {
      engine?: string;
      org_tier_type?: string;
      factors?: MatchResult["factors"];
      match_score_raw?: number;
    };
    return {
      organizationId: r.organization_id,
      orgTierType: (meta.org_tier_type === "tier_1_grassroots"
        ? "tier_1_grassroots"
        : "tier_2_social_service_agency") as OrgTierType,
      matchScore: typeof meta.match_score_raw === "number" ? meta.match_score_raw : 0,
      factors:
        meta.factors ?? {
          serviceFit: 0,
          availability: 0,
          qualityBoost: 0,
          languageMatch: 0,
          geography: 0,
        },
      reasons: Array.isArray(r.reasons) ? r.reasons : [],
      isFiltered: false,
      filterReason: null,
    };
  };

  const grassroots: MatchResult[] = [];
  const socialService: MatchResult[] = [];
  for (const r of v2Only) {
    const result = toResult(r);
    if (result.orgTierType === "tier_1_grassroots") grassroots.push(result);
    else socialService.push(result);
  }
  grassroots.sort((a, b) => b.matchScore - a.matchScore);
  socialService.sort((a, b) => b.matchScore - a.matchScore);

  return {
    runGroupId: headRunId,
    createdAt: headRunRows[0]?.created_at ?? null,
    grassroots,
    socialService,
  };
}
