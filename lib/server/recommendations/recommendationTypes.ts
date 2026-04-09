/**
 * Domain 5.2 — Recommendations / Resources — canonical types.
 *
 * Data class: B — Controlled Business (context inputs), Class D (result descriptions).
 *
 * This domain is the guidance layer on top of provider_search_index. The key
 * architectural rule: backend generates recommendation sets, frontend only
 * renders them. No recommendation logic in UI components.
 *
 * Query surface rule: fetchCandidateResources() queries provider_search_index
 * ONLY — never organizations, programs, or providers tables directly.
 * ranking_score is NEVER exposed in any serializer output; reliability_tier
 * is the only trust display field.
 *
 * Distinct from lib/server/matching (Phase B advocate-driven case-to-org
 * matching) and from lib/server/search (Domain 0.6 explicit search) — this
 * is the applicant-facing curated guidance layer.
 */

import type { AccountType } from "@/lib/registry";

// ---------------------------------------------------------------------------
// Reason codes
// ---------------------------------------------------------------------------

/**
 * Enum of reason codes explaining why a resource was recommended.
 * Every RecommendationItem carries one reasonCode plus a human-readable reason.
 */
export const RECOMMENDATION_REASONS = [
  "location_match",
  "intake_need_match",
  "case_stage_relevant",
  "high_trust",
  "popular_in_area",
  "program_available",
  "previously_saved",
] as const;

export type RecommendationReason = (typeof RECOMMENDATION_REASONS)[number];

// ---------------------------------------------------------------------------
// Reliability tier — display-only trust indicator
// ---------------------------------------------------------------------------

/**
 * The coarse-grained reliability tier surfaced to applicants.
 * Maps 1:1 to the Domain 0.5 trust grading tiers. Never the raw ranking_score.
 */
export const RELIABILITY_TIERS = [
  "verified",
  "established",
  "emerging",
  "unverified",
] as const;

export type ReliabilityTier = (typeof RELIABILITY_TIERS)[number];

// ---------------------------------------------------------------------------
// Category enum — broad grouping for resource discovery
// ---------------------------------------------------------------------------

export const RECOMMENDATION_CATEGORIES = [
  "legal",
  "housing",
  "crisis",
  "counseling",
  "financial",
  "medical",
  "advocacy",
  "immigration",
  "general",
] as const;

export type RecommendationCategory = (typeof RECOMMENDATION_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Priority — relative ordering within a set
// ---------------------------------------------------------------------------

export const RECOMMENDATION_PRIORITIES = ["high", "medium", "low"] as const;
export type RecommendationPriority = (typeof RECOMMENDATION_PRIORITIES)[number];

// ---------------------------------------------------------------------------
// Context — inputs that shape a recommendation run
// ---------------------------------------------------------------------------

/**
 * Assembled context used by generateRecommendations().
 * Everything the engine needs is on this object — the engine itself never
 * reaches into auth, intake, or case tables.
 */
export interface RecommendationContext {
  userId: string;
  accountType: AccountType;
  /** Applicant location — sourced from applicant_profiles. Null if unknown. */
  location: {
    stateCode: string | null;
    lat: number | null;
    lng: number | null;
  };
  /** Service needs / categories derived from latest intake signals (empty if none). */
  intakeSignals: {
    serviceTags: string[];
    categories: RecommendationCategory[];
    preferredLanguage: string | null;
  };
  /** Optional case context — shifts which resources are relevant by stage. */
  caseId: string | null;
  workflowState: string | null;
  /** Providers to exclude from suggestions (already selected, rejected, etc). */
  excludedProviderIds: string[];
}

// ---------------------------------------------------------------------------
// Candidate resource — internal shape returned by fetchCandidateResources
// ---------------------------------------------------------------------------

/**
 * Lightweight row returned from provider_search_index, enriched with
 * engine-local signals (distance, matchedTags). Never leaves the engine —
 * the service layer maps it to RecommendationItem before any caller sees it.
 */
export interface CandidateResource {
  organizationId: string;
  name: string;
  description: string | null;
  stateCodes: string[];
  serviceTags: string[];
  languages: string[];
  acceptingClients: boolean;
  capacityStatus: string | null;
  /** Backend-calculated distance in miles (null when no geo filter). */
  distanceMiles: number | null;
  /** Display-only tier. Never raw ranking_score. */
  reliabilityTier: ReliabilityTier;
  /** Service tags on the resource that matched intake categories. */
  matchedTags: string[];
}

// ---------------------------------------------------------------------------
// RecommendationItem — single rendered suggestion
// ---------------------------------------------------------------------------

export interface RecommendationItem {
  resourceId: string;
  resourceType: "organization" | "program" | "event";
  title: string;
  description: string | null;
  /** Human-readable explanation shown in UI. */
  reason: string;
  /** Enum discriminator for the human-readable reason. */
  reasonCode: RecommendationReason;
  priority: RecommendationPriority;
  category: RecommendationCategory;
  /** Verb/label for the primary action button, e.g. "Get help", "Learn more". */
  actionLabel: string;
  /** Backend-calculated miles from applicant location (null when unknown). */
  distanceMiles: number | null;
  /** Display-only trust tier. ranking_score MUST NOT be exposed here. */
  reliabilityTier: ReliabilityTier;
}

// ---------------------------------------------------------------------------
// RecommendationSet — ordered collection returned to a caller
// ---------------------------------------------------------------------------

export interface RecommendationSet {
  /** ULID/UUID identifying this generation run. */
  setId: string;
  /** The user the set was generated for. */
  userId: string;
  items: RecommendationItem[];
  /** ISO-8601 timestamp when this set was generated. */
  generatedAt: string;
  /** Context snapshot used to generate this set (subset — no PII). */
  contextSummary: {
    stateCode: string | null;
    categories: RecommendationCategory[];
    workflowState: string | null;
    excludedCount: number;
  };
}
