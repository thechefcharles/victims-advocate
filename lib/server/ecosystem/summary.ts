/**
 * Phase G: Assemble ecosystem overview response from aggregates.
 */

import type { EcosystemFilters, EcosystemOverviewResponse, OrgSegmentRow } from "./types";
import { computeEcosystemGaps } from "./gaps";
import {
  filterOrgForEcosystem,
  loadEcosystemAggregates,
  orgWorkflowSignals,
  summarizeOrgForSegment,
} from "./aggregate";
import { countiesFromCoverage } from "./regions";

function countMapIncrement(m: Record<string, number>, key: string, n = 1) {
  m[key] = (m[key] ?? 0) + n;
}

export async function buildEcosystemOverview(
  filters: EcosystemFilters
): Promise<EcosystemOverviewResponse> {
  const data = await loadEcosystemAggregates(filters);
  const { filteredOrgs, designations, matchRuns, casesByState } = data;

  const orgs_by_service_type: Record<string, number> = {};
  const orgs_by_language: Record<string, number> = {};
  const orgs_by_special_population: Record<string, number> = {};
  let orgs_virtual_capable = 0;
  const capacity_distribution: Record<string, number> = {};
  const designation_distribution: Record<string, number> = {};
  const response_time_bands: Record<string, number> = {
    under_24h: 0,
    "24_to_72h": 0,
    "72_to_168h": 0,
    over_168h: 0,
    unknown: 0,
  };
  const profile_completeness_distribution: Record<string, number> = {
    complete: 0,
    partial: 0,
    minimal: 0,
  };

  let accepting_clients_orgs = 0;
  let orgs_with_designation = 0;
  let orgs_insufficient = 0;
  let orgs_low_conf = 0;
  let orgs_minimal_profile = 0;
  let capacity_waitlist_limited = 0;
  let orgs_wheelchair = 0;
  let orgs_interpreter = 0;

  for (const org of filteredOrgs) {
    if (org.accepting_clients) accepting_clients_orgs++;
    const cap = String(org.capacity_status ?? "unknown");
    countMapIncrement(capacity_distribution, cap);
    if (cap === "waitlist" || cap === "limited") capacity_waitlist_limited++;

    const h =
      org.avg_response_time_hours != null && org.avg_response_time_hours !== ""
        ? Number(org.avg_response_time_hours)
        : NaN;
    if (!Number.isFinite(h)) response_time_bands.unknown++;
    else if (h <= 24) response_time_bands.under_24h++;
    else if (h <= 72) response_time_bands["24_to_72h"]++;
    else if (h <= 168) response_time_bands["72_to_168h"]++;
    else response_time_bands.over_168h++;

    const acc = ((org.accessibility_features as string[]) || []).map((x) => x.toLowerCase());
    if (acc.includes("virtual_services")) orgs_virtual_capable++;
    if (acc.includes("wheelchair_access")) orgs_wheelchair++;
    if (acc.includes("interpreters")) orgs_interpreter++;

    for (const s of (org.service_types as string[]) || []) {
      countMapIncrement(orgs_by_service_type, s.toLowerCase());
    }
    for (const lang of (org.languages as string[]) || []) {
      countMapIncrement(orgs_by_language, lang.toLowerCase());
    }
    for (const p of (org.special_populations as string[]) || []) {
      countMapIncrement(orgs_by_special_population, p.toLowerCase());
    }

    const des = designations.get(org.id);
    if (des) {
      orgs_with_designation++;
      countMapIncrement(designation_distribution, des.designation_tier);
      if (des.designation_tier === "insufficient_data") orgs_insufficient++;
      if (des.designation_confidence === "low") orgs_low_conf++;
    } else {
      countMapIncrement(designation_distribution, "none");
    }

    const seg = summarizeOrgForSegment(org, des ?? null, {
      routing_runs_in_window: 0,
      completeness_runs_in_window: 0,
      messages_sent_in_window: 0,
      match_rows_as_target_in_window: 0,
    });
    countMapIncrement(profile_completeness_distribution, seg.profile_completeness);
    if (seg.profile_completeness === "minimal") orgs_minimal_profile++;
  }

  const demand_service_counts: Record<string, number> = {};
  const demand_language_counts: Record<string, number> = {};
  let accessibility_demand_runs = 0;

  let no_match = 0;
  let low_tier_only = 0;
  for (const run of matchRuns) {
    if (run.empty) no_match++;
    for (const s of run.services) {
      countMapIncrement(demand_service_counts, s);
    }
    if (run.language) {
      countMapIncrement(demand_language_counts, run.language);
    }
    if (run.accessibilityNeeds > 0) accessibility_demand_runs++;
    if (!run.empty && run.only_limited) low_tier_only++;
  }

  const total_match_runs = matchRuns.length;
  let cases_in_window = 0;
  if (filters.state) {
    cases_in_window = casesByState[filters.state] ?? 0;
  } else {
    cases_in_window = Object.values(casesByState).reduce((a, b) => a + b, 0);
  }

  let routing_total = 0;
  let completeness_total = 0;
  let messaging_total = 0;
  for (const org of filteredOrgs) {
    routing_total += data.routingByOrg[org.id] ?? 0;
    completeness_total += data.completenessByOrg[org.id] ?? 0;
    messaging_total += data.messagesByOrg[org.id] ?? 0;
  }

  const gaps = computeEcosystemGaps({
    filters,
    activeOrgs: filteredOrgs.length,
    acceptingOrgs: accepting_clients_orgs,
    capacityWaitlistOrLimited: capacity_waitlist_limited,
    demandService: demand_service_counts,
    supplyService: orgs_by_service_type,
    demandLanguage: demand_language_counts,
    supplyLanguage: orgs_by_language,
    noMatchRuns: no_match,
    totalMatchRuns: total_match_runs,
    lowTierOnlyRuns: low_tier_only,
    orgsInsufficientDesignation: orgs_insufficient,
    orgsLowConfidenceDesignation: orgs_low_conf,
    orgsMinimalProfile: orgs_minimal_profile,
    accessibilityDemandCount: accessibility_demand_runs,
    orgsWithWheelchair: orgs_wheelchair,
    orgsWithInterpreter: orgs_interpreter,
  });

  const region_flags: string[] = [];
  if (filteredOrgs.length === 0 && filters.state) {
    region_flags.push(`No active organizations match filters for ${filters.state}.`);
  }
  if (total_match_runs === 0) {
    region_flags.push("No organization matching runs in the selected time window.");
  }
  if (filters.county && filteredOrgs.every((o) => countiesFromCoverage(o.coverage_area as Record<string, unknown>).length === 0)) {
    region_flags.push("County filter applied; most orgs only list state-level coverage — results may be sparse.");
  }

  const org_segments = [
    { key: "accepting", label: "Accepting clients", count: accepting_clients_orgs },
    {
      key: "designation_current",
      label: "Has current designation record",
      count: orgs_with_designation,
    },
    {
      key: "profile_complete",
      label: "Profile completeness: complete",
      count: profile_completeness_distribution.complete ?? 0,
    },
    {
      key: "virtual",
      label: "Virtual services listed",
      count: orgs_virtual_capable,
    },
  ];

  return {
    filters,
    summary: {
      active_orgs: filteredOrgs.length,
      accepting_clients_orgs: accepting_clients_orgs,
      match_runs_in_window: total_match_runs,
      match_runs_no_result: no_match,
      match_runs_low_tier_only: low_tier_only,
      cases_created_in_window: cases_in_window,
      orgs_with_current_designation: orgs_with_designation,
      designation_distribution,
      capacity_distribution,
      response_time_bands,
      profile_completeness_distribution,
      routing_runs_in_window: routing_total,
      completeness_runs_in_window: completeness_total,
      messaging_activity_in_window: messaging_total,
    },
    coverage: {
      orgs_by_service_type,
      orgs_by_language,
      orgs_by_special_population,
      orgs_virtual_capable,
      demand_service_counts,
      demand_language_counts,
    },
    demand_supply_gaps: gaps.slice(0, 20),
    org_segments,
    region_flags,
  };
}

export async function buildEcosystemOrgList(
  filters: EcosystemFilters
): Promise<OrgSegmentRow[]> {
  const data = await loadEcosystemAggregates(filters);
  const rows: OrgSegmentRow[] = [];
  for (const org of data.allActiveOrgs) {
    if (!filterOrgForEcosystem(org, filters)) continue;
    const wf = orgWorkflowSignals(
      org.id,
      data.routingByOrg,
      data.completenessByOrg,
      data.messagesByOrg,
      data.matchTargetRowsByOrg
    );
    rows.push(
      summarizeOrgForSegment(org, data.designations.get(org.id) ?? null, wf) as OrgSegmentRow
    );
  }
  rows.sort((a, b) => a.organization_name.localeCompare(b.organization_name));
  return rows;
}
