/**
 * Domain 3.4 — Matching engine V2: rankOrgs.
 *
 * Evaluates every candidate, applies hard filters, splits by org_tier_type
 * cohort, sorts descending by matchScore, and returns a MatchResultSet with
 * separate grassroots + social-service arrays. Callers decide display
 * interleaving; the engine never merges cohorts into a single ranking.
 *
 * Geography expansion: if fewer than 3 orgs survive hard filters with the
 * requested radius, the radius is expanded to 1.5× once and the evaluation
 * reruns. geographyExpanded reflects whether the retry fired.
 */

import { evaluateOrg } from "./evaluate";
import type {
  IntakeMatchProfile,
  MatchResult,
  MatchResultSet,
  OrgForMatching,
} from "./matchingTypes";

const MIN_PASSING_RESULTS = 3;
const GEO_EXPANSION_FACTOR = 1.5;

export function rankOrgs(
  orgs: OrgForMatching[],
  intake: IntakeMatchProfile,
): MatchResultSet {
  const first = orgs.map((o) => evaluateOrg(o, intake));
  let passing = first.filter((r) => !r.isFiltered);
  let geographyExpanded = false;

  if (passing.length < MIN_PASSING_RESULTS) {
    // Expand radius once — per spec, geography is the only dimension we relax.
    const expandedIntake: IntakeMatchProfile = {
      ...intake,
      radiusKm: intake.radiusKm * GEO_EXPANSION_FACTOR,
    };
    const retried = orgs.map((o) => evaluateOrg(o, expandedIntake));
    passing = retried.filter((r) => !r.isFiltered);
    geographyExpanded = true;
  }

  const grassroots: MatchResult[] = [];
  const socialService: MatchResult[] = [];
  for (const r of passing) {
    if (r.orgTierType === "tier_1_grassroots") grassroots.push(r);
    else socialService.push(r);
  }

  // Descending by matchScore; stable tiebreaker on organizationId for
  // deterministic output across runs.
  const cmp = (a: MatchResult, b: MatchResult) =>
    b.matchScore - a.matchScore || a.organizationId.localeCompare(b.organizationId);
  grassroots.sort(cmp);
  socialService.sort(cmp);

  return {
    grassroots,
    socialService,
    totalEvaluated: orgs.length,
    geographyExpanded,
  };
}
