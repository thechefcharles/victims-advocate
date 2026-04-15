/**
 * Domain 3.4 — Matching engine V2.
 *
 * Canonical entrypoints:
 *   evaluateOrg(org, intake)       — per-org factor + score
 *   rankOrgs(orgs, intake)         — cohort-split ranked result set
 *
 * V1 (legacy point-based) remains in ../evaluate.ts / ../rank.ts / ../service.ts
 * for the existing compensation match-orgs route until that route is migrated.
 */

export { evaluateOrg, computeMatchScore, MATCH_WEIGHTS, QUALITY_TIER_BOOST } from "./evaluate";
export {
  computeServiceFit,
  computeAvailability,
  computeQualityBoost,
  computeLanguageMatch,
  computeGeography,
} from "./evaluate";
export { rankOrgs } from "./rank";
export type {
  OrgTierType,
  QualityTierLabel,
  MatchFactors,
  IntakeMatchProfile,
  OrgForMatching,
  MatchResult,
  MatchResultSet,
} from "./matchingTypes";
