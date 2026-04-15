/**
 * Domain 3.4 — Matching engine V2 types.
 *
 * Spec-compliant normalized-weight model that replaces the legacy point-based
 * matcher in lib/server/matching/{evaluate,rank,service}.ts. V1 remains for
 * the compensation/cases/[id]/match-orgs route's persisted run history and
 * will be migrated separately.
 */

export type OrgTierType = "tier_1_grassroots" | "tier_2_social_service_agency";

export type QualityTierLabel =
  | "comprehensive"
  | "established"
  | "developing"
  | "data_pending";

/** The five factors, each [0, 1]. Weighted sum = match_score. */
export interface MatchFactors {
  serviceFit: number;
  availability: number;
  qualityBoost: number;
  languageMatch: number;
  geography: number;
}

export interface IntakeMatchProfile {
  serviceTypesNeeded: string[];
  crimeType: string | null;
  locationZip: string | null;
  locationCounty: string | null;
  /** Desired radius in kilometers. Used by the geography factor. */
  radiusKm: number;
  /** Optional — set when the geography factor should compute actual distance. */
  originLat?: number | null;
  originLng?: number | null;
  languagePreference: string | null;
  requiresLanguageMatch: boolean;
}

export interface OrgForMatching {
  id: string;
  orgTierType: OrgTierType;
  serviceTypes: string[];
  programTypes: string[];
  coverageZips: string[];
  coverageCounties: string[];
  coverageStates: string[];
  acceptingClients: boolean;
  capacityStatus: "open" | "limited" | "waitlist" | "paused" | "unknown";
  languages: string[];
  verifiedLanguages: string[];
  /** Distance in km from intake origin when computed; null when unknown. */
  distanceKm: number | null;
  /** Active quality tier from trust_signal_summary. Null → data_pending. */
  qualityTier: QualityTierLabel | null;
}

export interface MatchResult {
  organizationId: string;
  orgTierType: OrgTierType;
  /** Weighted sum of factors in [0, 1]. */
  matchScore: number;
  factors: MatchFactors;
  reasons: string[];
  isFiltered: boolean;
  filterReason: string | null;
}

export interface MatchResultSet {
  grassroots: MatchResult[];
  socialService: MatchResult[];
  totalEvaluated: number;
  geographyExpanded: boolean;
}
