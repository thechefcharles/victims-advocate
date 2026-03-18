/**
 * Phase G: Regional grouping — state-first, county when present, graceful fallback.
 */

import type { EcosystemFilters } from "./types";

const US_STATE = /^[A-Z]{2}$/;

export function normalizeStateCode(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const u = raw.trim().toUpperCase();
  return US_STATE.test(u) ? u : null;
}

/** States an org lists in coverage_area (empty = treated as undefined geography). */
export function statesFromCoverage(coverage: Record<string, unknown> | null | undefined): string[] {
  if (!coverage || typeof coverage !== "object") return [];
  const statesVal = coverage.states ?? coverage.state;
  const out = new Set<string>();
  if (Array.isArray(statesVal)) {
    for (const x of statesVal) {
      const s = normalizeStateCode(String(x));
      if (s) out.add(s);
    }
  } else if (typeof statesVal === "string" && statesVal.trim()) {
    const s = normalizeStateCode(statesVal);
    if (s) out.add(s);
  }
  return [...out].sort();
}

export function countiesFromCoverage(coverage: Record<string, unknown> | null | undefined): string[] {
  if (!coverage || typeof coverage !== "object") return [];
  const c = coverage.counties ?? coverage.county;
  const out: string[] = [];
  if (Array.isArray(c)) {
    for (const x of c) {
      const t = String(x).trim();
      if (t) out.push(t.toLowerCase());
    }
  } else if (typeof c === "string" && c.trim()) {
    out.push(c.trim().toLowerCase());
  }
  return out;
}

export function orgAppliesToState(
  states: string[],
  filterState: string | null
): boolean {
  if (!filterState) return true;
  if (states.length === 0) return true;
  return states.includes(filterState);
}

export function orgAppliesToCounty(
  counties: string[],
  filterCounty: string | null
): boolean {
  if (!filterCounty) return true;
  const fc = filterCounty.trim().toLowerCase();
  if (counties.length === 0) return true;
  return counties.some((c) => c.includes(fc) || fc.includes(c));
}

export function regionLabelForOrg(states: string[], counties: string[]): string {
  if (states.length === 0 && counties.length === 0) return "Coverage unspecified";
  if (states.length === 1 && counties.length === 0) return states[0]!;
  if (states.length <= 3 && counties.length === 0) return states.join(", ");
  if (states.length > 0 && counties.length > 0) return `${states.slice(0, 2).join(", ")} (+local)`;
  if (states.length > 3) return `${states.length} states`;
  return states[0] ?? "Multi-region";
}

export function matchSnapshotState(snapshot: Record<string, unknown> | null | undefined): string | null {
  if (!snapshot) return null;
  return normalizeStateCode(
    typeof snapshot.state_code === "string" ? snapshot.state_code : null
  );
}

export function filtersApplyToMatchState(
  filters: EcosystemFilters,
  matchState: string | null
): boolean {
  if (!filters.state) return true;
  if (!matchState) return true;
  return matchState === filters.state;
}
