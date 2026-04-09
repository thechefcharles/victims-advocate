/**
 * Domain 5.2 — Recommendation serializers.
 *
 * Three context-aware views:
 *   serializeForApplicant — human-readable, no internal signals
 *   serializeForProvider  — non-personalized resource discovery shape
 *   serializeForAdmin     — full set + context debug metadata
 *
 * **Rule:** ranking_score MUST NOT appear in any serializer output. The type
 * system enforces this — there is no ranking_score field anywhere on
 * RecommendationItem / RecommendationSet. reliabilityTier is the only
 * trust display field.
 */

import type {
  RecommendationItem,
  RecommendationSet,
} from "./recommendationTypes";

// ---------------------------------------------------------------------------
// Applicant view
// ---------------------------------------------------------------------------

export type ApplicantRecommendationItem = {
  resourceId: string;
  resourceType: "organization" | "program" | "event";
  title: string;
  description: string | null;
  reason: string;
  actionLabel: string;
  distanceMiles: number | null;
  reliabilityTier: string;
  category: string;
  priority: string;
};

export type ApplicantRecommendationSet = {
  setId: string;
  items: ApplicantRecommendationItem[];
  generatedAt: string;
};

/**
 * Applicant-facing shape. Excludes reasonCode (internal enum), userId,
 * and the context summary. Only fields safe to display are emitted.
 */
export function serializeForApplicant(
  set: RecommendationSet,
): ApplicantRecommendationSet {
  return {
    setId: set.setId,
    generatedAt: set.generatedAt,
    items: set.items.map(itemForApplicant),
  };
}

function itemForApplicant(item: RecommendationItem): ApplicantRecommendationItem {
  return {
    resourceId: item.resourceId,
    resourceType: item.resourceType,
    title: item.title,
    description: item.description,
    reason: item.reason,
    actionLabel: item.actionLabel,
    distanceMiles: item.distanceMiles,
    reliabilityTier: item.reliabilityTier,
    category: item.category,
    priority: item.priority,
  };
}

// ---------------------------------------------------------------------------
// Provider view — non-personalized discovery
// ---------------------------------------------------------------------------

export type ProviderRecommendationItem = {
  resourceId: string;
  resourceType: "organization" | "program" | "event";
  title: string;
  description: string | null;
  category: string;
  priority: string;
  reliabilityTier: string;
};

export type ProviderRecommendationSet = {
  setId: string;
  items: ProviderRecommendationItem[];
  generatedAt: string;
};

/**
 * Provider-facing shape. Strips the human-readable reason (which is
 * personalized language from an applicant perspective) and distance
 * (not relevant for provider-scope discovery).
 */
export function serializeForProvider(
  set: RecommendationSet,
): ProviderRecommendationSet {
  return {
    setId: set.setId,
    generatedAt: set.generatedAt,
    items: set.items.map((item) => ({
      resourceId: item.resourceId,
      resourceType: item.resourceType,
      title: item.title,
      description: item.description,
      category: item.category,
      priority: item.priority,
      reliabilityTier: item.reliabilityTier,
    })),
  };
}

// ---------------------------------------------------------------------------
// Admin view — full set with debug metadata
// ---------------------------------------------------------------------------

/**
 * Admin view — preserves the full RecommendationSet including context
 * summary and reasonCode on every item. Used for support + debugging.
 */
export function serializeForAdmin(set: RecommendationSet): RecommendationSet {
  return set;
}
