/**
 * Phase B: Hard filters — exclude orgs that clearly do not fit.
 */

import type { MatchingInput, OrgRowForMatching } from "./types";

export function stateInCoverage(
  coverage: Record<string, unknown>,
  state: string | null
): { inArea: boolean; defined: boolean } {
  if (!state) return { inArea: true, defined: false };
  const st = state.toUpperCase();
  const statesVal = coverage.states ?? coverage.state;
  let list: string[] = [];
  if (Array.isArray(statesVal)) {
    list = statesVal.map((x) => String(x).toUpperCase());
  } else if (typeof statesVal === "string" && statesVal.trim()) {
    list = [statesVal.trim().toUpperCase()];
  }
  if (list.length === 0) return { inArea: true, defined: false };
  return { inArea: list.includes(st), defined: true };
}

function hasVirtualOrg(org: OrgRowForMatching): boolean {
  return org.accessibility_features?.includes("virtual_services") ?? false;
}

export type HardFilterResult =
  | { ok: true; geo_excluded_but_virtual: boolean }
  | { ok: false; code: string };

export function applyHardFilters(
  org: OrgRowForMatching,
  input: MatchingInput
): HardFilterResult {
  if (org.profile_status !== "active") {
    return { ok: false, code: "profile_not_active" };
  }

  if (org.profile_stage !== "searchable" && org.profile_stage !== "enriched") {
    return { ok: false, code: "profile_not_searchable" };
  }

  if (!org.accepting_clients && org.capacity_status === "closed") {
    return { ok: false, code: "not_accepting_closed" };
  }

  if (input.service_types_needed.length > 0) {
    const orgSet = new Set((org.service_types || []).map((s) => s.toLowerCase()));
    const overlap = input.service_types_needed.some((n) => orgSet.has(n.toLowerCase()));
    if (!overlap) {
      return { ok: false, code: "no_service_overlap" };
    }
  }

  const { inArea, defined } = stateInCoverage(org.coverage_area || {}, input.state_code);
  let geoVirtual = false;
  if (defined && !inArea) {
    if (hasVirtualOrg(org) && input.virtual_ok) {
      geoVirtual = true;
    } else {
      return { ok: false, code: "outside_coverage" };
    }
  }

  return { ok: true, geo_excluded_but_virtual: geoVirtual };
}

export function orgProfileCompleteness(org: OrgRowForMatching): number {
  let n = 0;
  const max = 6;
  if ((org.service_types?.length ?? 0) > 0) n++;
  if ((org.languages?.length ?? 0) > 0) n++;
  if (Object.keys(org.coverage_area || {}).length > 0) n++;
  if ((org.intake_methods?.length ?? 0) > 0) n++;
  if (org.capacity_status && org.capacity_status !== "unknown") n++;
  if (org.accepting_clients || org.capacity_status === "open") n++;
  return n / max;
}
