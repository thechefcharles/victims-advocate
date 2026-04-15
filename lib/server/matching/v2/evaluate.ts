/**
 * Domain 3.4 — Matching engine V2: evaluateOrg.
 *
 * Produces a MatchResult for a single org/intake pair. Each of the five
 * spec factors is computed independently, then the weighted sum is formed.
 *
 * Hard filter rules (flag but DO NOT exclude here — caller filters):
 *   - availability = 0       → org paused or not accepting
 *   - serviceFit   = 0       → zero service overlap
 */

import type {
  IntakeMatchProfile,
  MatchFactors,
  MatchResult,
  OrgForMatching,
  QualityTierLabel,
} from "./matchingTypes";

// Canonical weights — must sum to exactly 1.0.
export const MATCH_WEIGHTS = {
  serviceFit: 0.4,
  availability: 0.3,
  qualityBoost: 0.15,
  languageMatch: 0.1,
  geography: 0.05,
} as const;

/** Tier → quality_boost. Spec: data_pending === developing (0.50, never 0). */
export const QUALITY_TIER_BOOST: Record<QualityTierLabel, number> = {
  comprehensive: 1.0,
  established: 0.75,
  developing: 0.5,
  data_pending: 0.5,
};

// ---------------------------------------------------------------------------
// Individual factor functions
// ---------------------------------------------------------------------------

export function computeServiceFit(org: OrgForMatching, intake: IntakeMatchProfile): number {
  const needs = intake.serviceTypesNeeded;
  if (needs.length === 0) return 0.5; // no stated need — neutral
  const orgSet = new Set(org.serviceTypes);
  let intersect = 0;
  for (const n of needs) if (orgSet.has(n)) intersect += 1;
  if (intersect === 0) return 0; // hard filter trigger
  let base = intersect / needs.length;
  // Location-in-coverage is a "bonus" over the base overlap per spec.
  const locationCovered =
    (intake.locationZip !== null && org.coverageZips.includes(intake.locationZip)) ||
    (intake.locationCounty !== null &&
      org.coverageCounties.includes(intake.locationCounty));
  if (locationCovered) base = Math.min(1, base + 0.2);
  return base;
}

export function computeAvailability(org: OrgForMatching): number {
  if (!org.acceptingClients) return 0;
  switch (org.capacityStatus) {
    case "open":
      return 1.0;
    case "limited":
      return 0.6;
    case "waitlist":
      return 0.3;
    case "paused":
      return 0; // hard filter trigger
    case "unknown":
    default:
      return 0.5;
  }
}

export function computeQualityBoost(tier: QualityTierLabel | null): number {
  if (tier === null) return QUALITY_TIER_BOOST.data_pending;
  return QUALITY_TIER_BOOST[tier] ?? QUALITY_TIER_BOOST.data_pending;
}

export function computeLanguageMatch(
  org: OrgForMatching,
  intake: IntakeMatchProfile,
): number {
  if (!intake.requiresLanguageMatch || !intake.languagePreference) return 0.5;
  const lang = intake.languagePreference.toLowerCase();
  if (org.verifiedLanguages.some((l) => l.toLowerCase() === lang)) return 1.0;
  if (org.languages.some((l) => l.toLowerCase() === lang)) return 0.5;
  if (org.languages.length === 0 && org.verifiedLanguages.length === 0) return 0.5;
  return 0;
}

export function computeGeography(
  org: OrgForMatching,
  intake: IntakeMatchProfile,
): number {
  // No origin → neutral. Distance-based scoring when available; fall back to
  // coverage-area match when the org is in the intake zip/county.
  const hasOrigin =
    intake.originLat != null &&
    intake.originLng != null &&
    Number.isFinite(intake.originLat) &&
    Number.isFinite(intake.originLng);
  if (!hasOrigin && intake.locationZip === null && intake.locationCounty === null) {
    return 0.5;
  }

  if (org.distanceKm !== null && hasOrigin) {
    if (org.distanceKm <= intake.radiusKm) return 1.0;
    if (org.distanceKm <= intake.radiusKm * 2) return 0.5;
    return 0;
  }

  // Coverage-area fallback.
  const zipCovered =
    intake.locationZip !== null && org.coverageZips.includes(intake.locationZip);
  const countyCovered =
    intake.locationCounty !== null &&
    org.coverageCounties.includes(intake.locationCounty);
  if (zipCovered || countyCovered) return 1.0;
  if (org.coverageStates.length > 0) return 0.5;
  return 0;
}

export function computeMatchScore(factors: MatchFactors): number {
  return (
    factors.serviceFit * MATCH_WEIGHTS.serviceFit +
    factors.availability * MATCH_WEIGHTS.availability +
    factors.qualityBoost * MATCH_WEIGHTS.qualityBoost +
    factors.languageMatch * MATCH_WEIGHTS.languageMatch +
    factors.geography * MATCH_WEIGHTS.geography
  );
}

// ---------------------------------------------------------------------------
// Reasons — positive only
// ---------------------------------------------------------------------------

function generateReasons(factors: MatchFactors): string[] {
  const out: string[] = [];
  if (factors.serviceFit > 0.8) out.push("Strong service match");
  if (factors.availability === 1) out.push("Accepting clients now");
  else if (factors.availability === 0.6) out.push("Limited availability");
  if (factors.languageMatch === 1) out.push("Language match confirmed");
  if (factors.geography > 0.7) out.push("Serves your area");
  if (factors.qualityBoost === 1) out.push("High quality rating");
  return out;
}

// ---------------------------------------------------------------------------
// Public evaluate
// ---------------------------------------------------------------------------

export function evaluateOrg(
  org: OrgForMatching,
  intake: IntakeMatchProfile,
): MatchResult {
  const factors: MatchFactors = {
    serviceFit: computeServiceFit(org, intake),
    availability: computeAvailability(org),
    qualityBoost: computeQualityBoost(org.qualityTier),
    languageMatch: computeLanguageMatch(org, intake),
    geography: computeGeography(org, intake),
  };

  let isFiltered = false;
  let filterReason: string | null = null;
  if (factors.availability === 0) {
    isFiltered = true;
    filterReason = "availability_zero";
  } else if (factors.serviceFit === 0) {
    isFiltered = true;
    filterReason = "service_fit_zero";
  }

  return {
    organizationId: org.id,
    orgTierType: org.orgTierType,
    matchScore: computeMatchScore(factors),
    factors,
    reasons: generateReasons(factors),
    isFiltered,
    filterReason,
  };
}
