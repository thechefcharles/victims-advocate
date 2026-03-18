/**
 * Phase G: Discrete profile completeness for internal ops (not a public score).
 */

export type ProfileCompletenessLevel = "complete" | "partial" | "minimal";

export type OrgProfileLike = {
  service_types?: string[] | null;
  languages?: string[] | null;
  coverage_area?: Record<string, unknown> | null;
  intake_methods?: string[] | null;
  capacity_status?: string | null;
  accepting_clients?: boolean | null;
  accessibility_features?: string[] | null;
  special_populations?: string[] | null;
};

function dimensionScore(org: OrgProfileLike): number {
  let n = 0;
  const max = 7;
  if ((org.service_types?.length ?? 0) > 0) n++;
  if ((org.languages?.length ?? 0) > 0) n++;
  if (org.coverage_area && Object.keys(org.coverage_area).length > 0) n++;
  if ((org.intake_methods?.length ?? 0) > 0) n++;
  if (org.capacity_status && org.capacity_status !== "unknown") n++;
  if (org.accepting_clients || org.capacity_status === "open") n++;
  if ((org.accessibility_features?.length ?? 0) > 0 || (org.special_populations?.length ?? 0) > 0)
    n++;
  return n / max;
}

export function computeOrgProfileCompletenessLevel(org: OrgProfileLike): ProfileCompletenessLevel {
  const s = dimensionScore(org);
  if (s >= 0.72) return "complete";
  if (s >= 0.43) return "partial";
  return "minimal";
}

export function computeOrgProfileCompletenessScore(org: OrgProfileLike): number {
  return Math.round(dimensionScore(org) * 100) / 100;
}
