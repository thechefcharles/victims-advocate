/**
 * Public matching engine types — MatchResult / MatchResultSet / factors.
 *
 * Re-exports the canonical definitions from the web app's matching domain.
 * Future: move these declarations into this package outright; the web app
 * will then import from @nxtstps/types.
 */

export type {
  OrgTierType,
  QualityTierLabel,
  MatchFactors,
  IntakeMatchProfile,
  OrgForMatching,
  MatchResult,
  MatchResultSet,
} from "@/lib/server/matching/v2/matchingTypes";
