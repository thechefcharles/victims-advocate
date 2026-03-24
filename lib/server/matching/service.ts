/**
 * Phase B: Organization matching service — load orgs, filter, score, persist, fetch latest.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { getCaseById } from "@/lib/server/data";
import type { MatchingInput, MatchEvaluation, OrgRowForMatching } from "./types";
import { buildMatchingInputFromCaseRow } from "./normalize";
import { applyHardFilters } from "./filters";
import { evaluateOrgMatch } from "./evaluate";
import { getCurrentDesignationsForOrgIds } from "@/lib/server/designations/service";
import { integrateDesignationIntoMatches } from "./integration";
import type { DesignationIntegrationMeta } from "./integration";
import type { OrganizationMatchRunRow } from "./types";

function rowToOrg(row: Record<string, unknown>): OrgRowForMatching {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    service_types: Array.isArray(row.service_types) ? (row.service_types as string[]) : [],
    languages: Array.isArray(row.languages) ? (row.languages as string[]) : [],
    coverage_area:
      row.coverage_area && typeof row.coverage_area === "object" && !Array.isArray(row.coverage_area)
        ? (row.coverage_area as Record<string, unknown>)
        : {},
    intake_methods: Array.isArray(row.intake_methods) ? (row.intake_methods as string[]) : [],
    hours: row.hours && typeof row.hours === "object" && !Array.isArray(row.hours)
      ? (row.hours as Record<string, unknown>)
      : {},
    accepting_clients: Boolean(row.accepting_clients),
    capacity_status: String(row.capacity_status ?? "unknown"),
    avg_response_time_hours:
      row.avg_response_time_hours != null && row.avg_response_time_hours !== ""
        ? Number(row.avg_response_time_hours)
        : null,
    special_populations: Array.isArray(row.special_populations)
      ? (row.special_populations as string[])
      : [],
    accessibility_features: Array.isArray(row.accessibility_features)
      ? (row.accessibility_features as string[])
      : [],
    profile_status: String(row.profile_status ?? "draft"),
    profile_stage: String(row.profile_stage ?? "created"),
    profile_last_updated_at:
      row.profile_last_updated_at != null ? String(row.profile_last_updated_at) : null,
  };
}

export async function loadActiveOrganizations(): Promise<OrgRowForMatching[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id,name,service_types,languages,coverage_area,intake_methods,hours,accepting_clients,capacity_status,avg_response_time_hours,special_populations,accessibility_features,profile_status,profile_stage,profile_last_updated_at"
    )
    .eq("profile_status", "active")
    .in("profile_stage", ["searchable", "enriched"]);

  if (error) {
    throw new AppError("INTERNAL", "Failed to load organizations", undefined, 500);
  }
  return (data ?? []).map((r) => rowToOrg(r as Record<string, unknown>));
}

export async function runOrganizationMatchingWithOrgs(
  input: MatchingInput,
  orgs: OrgRowForMatching[]
): Promise<{ matches: MatchEvaluation[]; designation_meta: DesignationIntegrationMeta }> {
  const evaluations: MatchEvaluation[] = [];
  for (const org of orgs) {
    const hard = applyHardFilters(org, input);
    if (!hard.ok) continue;
    evaluations.push(
      evaluateOrgMatch(org, input, { geo_excluded_but_virtual: hard.geo_excluded_but_virtual })
    );
  }

  let designationByOrgId = new Map<string, import("@/lib/server/designations/types").OrgDesignationRow>();
  try {
    designationByOrgId = await getCurrentDesignationsForOrgIds(
      evaluations.map((e) => e.organization_id)
    );
  } catch {
    designationByOrgId = new Map();
  }

  const { matches, meta } = integrateDesignationIntoMatches(evaluations, designationByOrgId);
  return { matches, designation_meta: meta };
}

export type RunCaseMatchingResult = {
  run_group_id: string;
  matches: MatchEvaluation[];
  match_count: number;
  input: MatchingInput;
  designation_meta: DesignationIntegrationMeta;
  input_summary: {
    service_types_needed: string[];
    state_code: string | null;
    intake_sparse: boolean;
  };
};

export async function runCaseOrganizationMatching(params: {
  caseId: string;
  ctx: AuthContext;
}): Promise<RunCaseMatchingResult> {
  const { caseId, ctx } = params;
  const caseResult = await getCaseById({ caseId, ctx });
  if (!caseResult) {
    throw new AppError("FORBIDDEN", "Access denied", undefined, 403);
  }

  const caseRow = caseResult.case as Record<string, unknown>;
  const scopeOrgId = caseRow.organization_id as string;
  if (!scopeOrgId) {
    throw new AppError("INTERNAL", "Case missing organization", undefined, 500);
  }

  const input = buildMatchingInputFromCaseRow(caseRow);
  const orgs = await loadActiveOrganizations();
  const { matches, designation_meta } = await runOrganizationMatchingWithOrgs(input, orgs);
  const run_group_id = crypto.randomUUID();

  return {
    run_group_id,
    matches,
    match_count: matches.length,
    input,
    designation_meta,
    input_summary: {
      service_types_needed: input.service_types_needed,
      state_code: input.state_code,
      intake_sparse: input.intake_sparse,
    },
  };
}

export async function persistOrganizationMatchRun(params: {
  caseId: string;
  scopeOrganizationId: string;
  runGroupId: string;
  actorUserId: string | null;
  input: MatchingInput;
  matches: MatchEvaluation[];
  designation_meta: DesignationIntegrationMeta;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const inputSnapshot = {
    service_types_needed: params.input.service_types_needed,
    preferred_language: params.input.preferred_language,
    state_code: params.input.state_code,
    county: params.input.county,
    zip_code: params.input.zip_code,
    virtual_ok: params.input.virtual_ok,
    needs_accessibility_features: params.input.needs_accessibility_features,
    special_population_flags: params.input.special_population_flags,
    urgent: params.input.urgent,
    intake_sparse: params.input.intake_sparse,
  };

  const orgs = await loadActiveOrganizations();
  const orgById = new Map(orgs.map((o) => [o.id, o]));

  const rows = params.matches.map((m) => {
    const org = orgById.get(m.organization_id);
    const profileSnap = org
      ? {
          service_types: org.service_types,
          languages: org.languages,
          coverage_area: org.coverage_area,
          accepting_clients: org.accepting_clients,
          capacity_status: org.capacity_status,
          accessibility_features: org.accessibility_features,
          special_populations: org.special_populations,
        }
      : {};

    return {
      case_id: params.caseId,
      scope_organization_id: params.scopeOrganizationId,
      organization_id: m.organization_id,
      organization_name: m.organization_name,
      organization_profile_snapshot: profileSnap,
      match_input_snapshot: inputSnapshot,
      match_score: m.match_score,
      fit_match_score: m.fit_match_score,
      match_tier: m.match_tier,
      strong_match: m.strong_match,
      possible_match: m.possible_match,
      limited_match: m.limited_match,
      reasons: m.reasons,
      flags: m.flags,
      metadata: {
        service_overlap: m.service_overlap,
        language_match: m.language_match,
        accessibility_match: m.accessibility_match,
        capacity_signal: m.capacity_signal,
        virtual_ok: m.virtual_ok,
        profile_completeness_score: m.profile_completeness_score,
        designation_integration: params.designation_meta,
      },
      run_group_id: params.runGroupId,
      actor_user_id: params.actorUserId,
      designation_tier: m.designation_tier,
      designation_confidence: m.designation_confidence,
      designation_summary: m.designation_summary,
      designation_influenced_match: m.designation_influenced_match,
      designation_reason: m.designation_reason,
      designation_applied: m.designation_boost_points > 0,
      designation_snapshot: {
        policy_version: params.designation_meta.policy_version,
        fit_match_score: m.fit_match_score,
        integrated_match_score: m.match_score,
        designation_boost_points: m.designation_boost_points,
        designation_tie_ordinal: m.designation_tie_ordinal,
      },
    };
  });

  if (rows.length === 0) {
    await supabase.from("organization_match_runs").insert({
      case_id: params.caseId,
      scope_organization_id: params.scopeOrganizationId,
      organization_id: params.scopeOrganizationId,
      organization_name: "(no matches)",
      organization_profile_snapshot: {},
      match_input_snapshot: inputSnapshot,
      match_score: 0,
      fit_match_score: 0,
      match_tier: "limited_match",
      strong_match: false,
      possible_match: false,
      limited_match: true,
      reasons: [],
      flags: ["No organizations matched the current criteria — try updating the application or org profiles"],
      metadata: { empty_run: true, designation_integration: params.designation_meta },
      run_group_id: params.runGroupId,
      actor_user_id: params.actorUserId,
      designation_tier: null,
      designation_confidence: null,
      designation_summary: null,
      designation_influenced_match: false,
      designation_reason: null,
      designation_applied: false,
      designation_snapshot: { policy_version: params.designation_meta.policy_version, empty_run: true },
    });
    return;
  }

  const { error } = await supabase.from("organization_match_runs").insert(rows);
  if (error) {
    throw new AppError("INTERNAL", "Failed to persist match results", error, 500);
  }
}

export async function getLatestOrganizationMatchesForCase(params: {
  caseId: string;
  ctx: AuthContext;
}): Promise<{
  run_group_id: string | null;
  created_at: string | null;
  matches: OrganizationMatchRunRow[];
  global_flags: string[];
} | null> {
  const caseResult = await getCaseById({ caseId: params.caseId, ctx: params.ctx });
  if (!caseResult) return null;

  const supabase = getSupabaseAdmin();
  const { data: latest } = await supabase
    .from("organization_match_runs")
    .select("run_group_id, created_at")
    .eq("case_id", params.caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest?.run_group_id) {
    return {
      run_group_id: null,
      created_at: null,
      matches: [],
      global_flags: [],
    };
  }

  const runGroupId = latest.run_group_id as string;
  const { data: rows } = await supabase
    .from("organization_match_runs")
    .select("*")
    .eq("run_group_id", runGroupId)
    .order("match_score", { ascending: false });

  const list = (rows ?? []) as Record<string, unknown>[];
  const global_flags: string[] = [];
  const matches: OrganizationMatchRunRow[] = [];

  for (const r of list) {
    if (r.metadata && (r.metadata as any).empty_run) {
      global_flags.push(
        ...((r.flags as string[]) || [
          "No organizations matched — criteria may be narrow or profiles incomplete",
        ])
      );
      continue;
    }
    matches.push({
      id: String(r.id),
      created_at: String(r.created_at),
      case_id: String(r.case_id),
      scope_organization_id: String(r.scope_organization_id),
      organization_id: String(r.organization_id),
      organization_name: String(r.organization_name),
      organization_profile_snapshot: (r.organization_profile_snapshot as Record<string, unknown>) ?? {},
      match_input_snapshot: (r.match_input_snapshot as Record<string, unknown>) ?? {},
      match_score: Number(r.match_score),
      fit_match_score:
        r.fit_match_score != null && r.fit_match_score !== ""
          ? Number(r.fit_match_score)
          : Number(r.match_score),
      match_tier: String(r.match_tier),
      strong_match: Boolean(r.strong_match),
      possible_match: Boolean(r.possible_match),
      limited_match: Boolean(r.limited_match),
      reasons: (r.reasons as string[]) ?? [],
      flags: (r.flags as string[]) ?? [],
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      run_group_id: String(r.run_group_id),
      actor_user_id: r.actor_user_id != null ? String(r.actor_user_id) : null,
      designation_tier: r.designation_tier != null ? String(r.designation_tier) : null,
      designation_confidence:
        r.designation_confidence != null ? String(r.designation_confidence) : null,
      designation_summary: r.designation_summary != null ? String(r.designation_summary) : null,
      designation_influenced_match: Boolean(r.designation_influenced_match),
      designation_reason: r.designation_reason != null ? String(r.designation_reason) : null,
      designation_snapshot: (r.designation_snapshot as Record<string, unknown>) ?? {},
      designation_applied: Boolean(r.designation_applied),
    });
  }

  return {
    run_group_id: runGroupId,
    created_at: latest.created_at as string,
    matches,
    global_flags,
  };
}

export function explainOrganizationMatch(m: MatchEvaluation): string {
  return [
    `Recommended based on your needs: ${m.reasons.slice(0, 4).join("; ")}`,
    m.flags.length ? `Note: ${m.flags[0]}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
