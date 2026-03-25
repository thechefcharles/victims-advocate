/**
 * Phase G: Load and aggregate org, match, case, and workflow signals (non-PII).
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCurrentDesignationsForOrgIds } from "@/lib/server/designations/service";
import type { OrgDesignationRow } from "@/lib/server/designations/types";
import {
  countiesFromCoverage,
  filtersApplyToMatchState,
  matchSnapshotState,
  orgAppliesToCounty,
  orgAppliesToState,
  statesFromCoverage,
} from "./regions";
import type { EcosystemFilters } from "./types";
import {
  computeOrgProfileCompletenessLevel,
  type OrgProfileLike,
} from "@/lib/server/organizations/profileCompleteness";
import { buildOrgInternalFollowupCue } from "@/lib/organizations/internalFollowupCues";
import { isOrganizationMatchingEligible } from "@/lib/organizations/profileStage";

export type OrgRow = Record<string, unknown> & { id: string; name: string };

export type MatchRunAggregate = {
  run_group_id: string;
  state: string | null;
  services: string[];
  language: string | null;
  accessibilityNeeds: number;
  empty: boolean;
  has_strong: boolean;
  has_possible: boolean;
  only_limited: boolean;
};

function clampDays(d: number): number {
  if (!Number.isFinite(d) || d < 1) return 30;
  return Math.min(365, Math.floor(d));
}

export function parseEcosystemFilters(searchParams: URLSearchParams): EcosystemFilters {
  const state = searchParams.get("state")?.trim().toUpperCase() || null;
  const county = searchParams.get("county")?.trim() || null;
  const tw = parseInt(searchParams.get("time_window_days") || "30", 10);
  const service_type = searchParams.get("service_type")?.trim().toLowerCase() || null;
  const language = searchParams.get("language")?.trim().toLowerCase() || null;
  return {
    state: state && /^[A-Z]{2}$/.test(state) ? state : null,
    county: county || null,
    time_window_days: clampDays(tw),
    service_type: service_type || null,
    language: language || null,
  };
}

export function filterOrgForEcosystem(org: OrgRow, filters: EcosystemFilters): boolean {
  const states = statesFromCoverage(org.coverage_area as Record<string, unknown>);
  const counties = countiesFromCoverage(org.coverage_area as Record<string, unknown>);
  if (!orgAppliesToState(states, filters.state)) return false;
  if (!orgAppliesToCounty(counties, filters.county)) return false;
  if (filters.service_type) {
    const st = (org.service_types as string[]) || [];
    if (!st.map((x) => x.toLowerCase()).includes(filters.service_type)) return false;
  }
  if (filters.language) {
    const langs = (org.languages as string[]) || [];
    if (!langs.map((x) => x.toLowerCase()).includes(filters.language)) return false;
  }
  return true;
}

export async function loadEcosystemAggregates(filters: EcosystemFilters): Promise<{
  sinceIso: string;
  allActiveOrgs: OrgRow[];
  filteredOrgs: OrgRow[];
  designations: Map<string, OrgDesignationRow>;
  matchRuns: MatchRunAggregate[];
  casesByState: Record<string, number>;
  routingByOrg: Record<string, number>;
  completenessByOrg: Record<string, number>;
  messagesByOrg: Record<string, number>;
  matchTargetRowsByOrg: Record<string, number>;
}> {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - filters.time_window_days * 86400000);
  const sinceIso = since.toISOString();

  // Org row bar aligns with matching/discovery eligibility (Phase 6).
  const { data: orgData, error: orgErr } = await supabase
    .from("organizations")
    .select(
      "id,name,status,lifecycle_status,public_profile_status,service_types,languages,coverage_area,intake_methods,hours,accepting_clients,capacity_status,avg_response_time_hours,special_populations,accessibility_features,profile_status,profile_stage"
    )
    .eq("profile_status", "active")
    .eq("status", "active")
    .eq("lifecycle_status", "managed")
    .eq("public_profile_status", "active")
    .in("profile_stage", ["searchable", "enriched"]);

  if (orgErr) {
    throw new Error(orgErr.message);
  }

  const allActiveOrgs = (orgData ?? []) as OrgRow[];
  const filteredOrgs = allActiveOrgs.filter(
    (o) => isOrganizationMatchingEligible(o as any) && filterOrgForEcosystem(o, filters)
  );

  const desMap = await getCurrentDesignationsForOrgIds(allActiveOrgs.map((o) => o.id));

  const { data: matchRows, error: mErr } = await supabase
    .from("organization_match_runs")
    .select(
      "run_group_id,created_at,match_input_snapshot,metadata,strong_match,possible_match,limited_match,organization_id,organization_name"
    )
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });

  if (mErr) {
    throw new Error(mErr.message);
  }

  const runAccum = new Map<
    string,
    {
      state: string | null;
      services: Set<string>;
      language: string | null;
      acc: number;
      empty: boolean;
      strong: boolean;
      possible: boolean;
      orgRows: { limited: boolean; strong: boolean; possible: boolean; skip: boolean }[];
    }
  >();

  for (const row of matchRows ?? []) {
    const gid = String(row.run_group_id);
    const snap = (row.match_input_snapshot as Record<string, unknown>) || {};
    const meta = (row.metadata as Record<string, unknown>) || {};
    const empty = Boolean(meta.empty_run);
    const name = String(row.organization_name || "");

    if (!runAccum.has(gid)) {
      const svcs = Array.isArray(snap.service_types_needed)
        ? (snap.service_types_needed as string[]).map((s) => String(s).toLowerCase())
        : [];
      const lang =
        typeof snap.preferred_language === "string"
          ? snap.preferred_language.toLowerCase()
          : null;
      const acc = Array.isArray(snap.needs_accessibility_features)
        ? (snap.needs_accessibility_features as unknown[]).length
        : 0;
      runAccum.set(gid, {
        state: matchSnapshotState(snap),
        services: new Set(svcs),
        language: lang,
        acc,
        empty,
        strong: false,
        possible: false,
        orgRows: [],
      });
    }
    const acc = runAccum.get(gid)!;
    if (empty || name === "(no matches)") {
      acc.empty = acc.empty || empty;
      continue;
    }
    const strong = Boolean(row.strong_match);
    const possible = Boolean(row.possible_match);
    const limited = Boolean(row.limited_match);
    acc.strong = acc.strong || strong;
    acc.possible = acc.possible || possible;
    acc.orgRows.push({
      limited,
      strong,
      possible,
      skip: false,
    });
  }

  const matchRuns: MatchRunAggregate[] = [];
  for (const [run_group_id, v] of runAccum) {
    if (!filtersApplyToMatchState(filters, v.state)) continue;
    const onlyLimited =
      v.orgRows.length > 0 &&
      v.orgRows.every((r) => r.limited && !r.strong && !r.possible);
    matchRuns.push({
      run_group_id,
      state: v.state,
      services: [...v.services],
      language: v.language,
      accessibilityNeeds: v.acc,
      empty: v.empty,
      has_strong: v.strong,
      has_possible: v.possible,
      only_limited: onlyLimited && !v.strong && !v.possible,
    });
  }

  const { data: caseRows } = await supabase
    .from("cases")
    .select("state_code")
    .gte("created_at", sinceIso);

  const casesByState: Record<string, number> = {};
  for (const c of caseRows ?? []) {
    const sc = typeof c.state_code === "string" ? c.state_code.toUpperCase() : "UNK";
    casesByState[sc] = (casesByState[sc] ?? 0) + 1;
  }

  const { data: routRows } = await supabase
    .from("routing_runs")
    .select("organization_id")
    .gte("created_at", sinceIso);

  const routingByOrg: Record<string, number> = {};
  for (const r of routRows ?? []) {
    const id = String(r.organization_id);
    routingByOrg[id] = (routingByOrg[id] ?? 0) + 1;
  }

  const { data: compRows } = await supabase
    .from("completeness_runs")
    .select("organization_id")
    .gte("created_at", sinceIso);

  const completenessByOrg: Record<string, number> = {};
  for (const r of compRows ?? []) {
    const id = String(r.organization_id);
    completenessByOrg[id] = (completenessByOrg[id] ?? 0) + 1;
  }

  const { data: msgRows } = await supabase
    .from("case_messages")
    .select("organization_id")
    .gte("created_at", sinceIso)
    .limit(50000);

  const messagesByOrg: Record<string, number> = {};
  for (const r of msgRows ?? []) {
    const id = String(r.organization_id);
    messagesByOrg[id] = (messagesByOrg[id] ?? 0) + 1;
  }

  const { data: targetRows } = await supabase
    .from("organization_match_runs")
    .select("organization_id,metadata")
    .gte("created_at", sinceIso)
    .limit(50000);

  const matchTargetRowsByOrg: Record<string, number> = {};
  for (const r of targetRows ?? []) {
    const meta = (r.metadata as Record<string, unknown>) || {};
    if (meta.empty_run) continue;
    const id = String(r.organization_id);
    matchTargetRowsByOrg[id] = (matchTargetRowsByOrg[id] ?? 0) + 1;
  }

  return {
    sinceIso,
    allActiveOrgs,
    filteredOrgs,
    designations: desMap,
    matchRuns,
    casesByState,
    routingByOrg,
    completenessByOrg,
    messagesByOrg,
    matchTargetRowsByOrg,
  };
}

export function orgWorkflowSignals(
  orgId: string,
  routingByOrg: Record<string, number>,
  completenessByOrg: Record<string, number>,
  messagesByOrg: Record<string, number>,
  matchTargetRowsByOrg: Record<string, number>
) {
  return {
    routing_runs_in_window: routingByOrg[orgId] ?? 0,
    completeness_runs_in_window: completenessByOrg[orgId] ?? 0,
    messages_sent_in_window: messagesByOrg[orgId] ?? 0,
    match_rows_as_target_in_window: matchTargetRowsByOrg[orgId] ?? 0,
  };
}

export function summarizeOrgForSegment(
  org: OrgRow,
  des: OrgDesignationRow | null,
  wf: ReturnType<typeof orgWorkflowSignals>
) {
  const states = statesFromCoverage(org.coverage_area as Record<string, unknown>);
  const counties = countiesFromCoverage(org.coverage_area as Record<string, unknown>);
  const acc = (org.accessibility_features as string[]) || [];
  const virtual = acc.map((x) => x.toLowerCase()).includes("virtual_services");
  const profileStage = String(org.profile_stage ?? "created");
  const profileStatus = String(org.profile_status ?? "");
  const internal_followup_cue = buildOrgInternalFollowupCue({
    orgStatus: String(org.status),
    profileStatus: org.profile_status != null ? String(org.profile_status) : null,
    profileStage: org.profile_stage != null ? String(org.profile_stage) : null,
    capacityStatus: org.capacity_status != null ? String(org.capacity_status) : null,
    acceptingClients: org.accepting_clients === true,
    designationTier: des?.designation_tier ?? null,
    designationConfidence: des?.designation_confidence ?? null,
    routingInWindow: wf.routing_runs_in_window,
    completenessInWindow: wf.completeness_runs_in_window,
    workflowMessagesInWindow: wf.messages_sent_in_window,
  });
  return {
    organization_id: org.id,
    organization_name: String(org.name),
    region_label:
      states.length > 0
        ? states.join(", ") + (counties.length ? ` · ${counties.length} local area(s)` : "")
        : "Unspecified",
    states_covered: states,
    service_types: (org.service_types as string[]) || [],
    languages: (org.languages as string[]) || [],
    capacity_status: String(org.capacity_status ?? "unknown"),
    accepting_clients: Boolean(org.accepting_clients),
    profile_status: profileStatus,
    profile_stage: profileStage,
    designation_tier: des?.designation_tier ?? null,
    designation_confidence: des?.designation_confidence ?? null,
    profile_completeness: computeOrgProfileCompletenessLevel(org as OrgProfileLike),
    virtual_services: virtual,
    internal_followup_cue,
    ...wf,
  };
}
