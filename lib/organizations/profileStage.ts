import type { OrganizationProfile, OrgProfileStage } from "@/lib/server/organizations/types";

/** True when coverage JSON includes at least one non-empty signal (state list, notes, etc.). */
export function coverageAreaHasSignal(area: Record<string, unknown>): boolean {
  for (const v of Object.values(area)) {
    if (v == null || v === "") continue;
    if (typeof v === "string" && v.trim() === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      if (Object.keys(v as Record<string, unknown>).length > 0) return true;
      continue;
    }
    return true;
  }
  return false;
}

function hoursHasSignal(hours: Record<string, unknown>): boolean {
  return coverageAreaHasSignal(hours);
}

/** Minimum bar to appear in matching directory (still requires profile_status active in loaders). */
export function meetsSearchableMinimum(profile: OrganizationProfile): boolean {
  const hasServices = Array.isArray(profile.service_types) && profile.service_types.length > 0;
  const hasLanguages = Array.isArray(profile.languages) && profile.languages.length > 0;
  const hasCoverage = coverageAreaHasSignal(profile.coverage_area ?? {});
  const hasCapacity = profile.capacity_status !== "unknown";

  return hasServices && hasLanguages && hasCoverage && hasCapacity;
}

function hasEnrichedSignals(profile: OrganizationProfile): boolean {
  return (
    hoursHasSignal(profile.hours ?? {}) ||
    (profile.intake_methods?.length ?? 0) > 0 ||
    (profile.accessibility_features?.length ?? 0) > 0 ||
    (profile.special_populations?.length ?? 0) > 0
  );
}

export function computeOrganizationProfileStage(profile: OrganizationProfile): OrgProfileStage {
  if (!meetsSearchableMinimum(profile)) return "created";
  if (hasEnrichedSignals(profile)) return "enriched";
  return "searchable";
}

export function isOrganizationSearchable(profile: OrganizationProfile): boolean {
  const stage = computeOrganizationProfileStage(profile);
  return stage === "searchable" || stage === "enriched";
}

/** Plain-language items still missing before the org can reach searchable. */
export function listMissingForSearchable(profile: OrganizationProfile): string[] {
  const missing: string[] = [];
  if (!profile.service_types?.length) {
    missing.push("At least one service type");
  }
  if (!profile.languages?.length) {
    missing.push("At least one language");
  }
  if (!coverageAreaHasSignal(profile.coverage_area ?? {})) {
    missing.push("Coverage area (who you serve geographically)");
  }
  if (profile.capacity_status === "unknown") {
    missing.push("Capacity status (open, limited, waitlist, or closed)");
  }
  return missing;
}

/** Optional depth fields — not required for matching, but move the stage to enriched. */
export function listOptionalEnrichedHints(profile: OrganizationProfile): string[] {
  if (computeOrganizationProfileStage(profile) !== "searchable") return [];
  const hints: string[] = [];
  if (!hoursHasSignal(profile.hours ?? {})) hints.push("Typical hours");
  if (!profile.intake_methods?.length) hints.push("Intake methods");
  if (!profile.accessibility_features?.length) hints.push("Accessibility features");
  if (!profile.special_populations?.length) hints.push("Special populations served");
  return hints;
}
