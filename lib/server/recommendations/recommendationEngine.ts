/**
 * Domain 5.2 — Recommendations engine.
 *
 * Pure ranking + fetch layer. No auth, no policy, no serialization.
 *
 * fetchCandidateResources(context)
 *   - Queries provider_search_index ONLY (Search Law — Rule 12).
 *   - Applies state, service-tag, and geo filters from the context.
 *   - Returns CandidateResource rows with reliabilityTier (never ranking_score).
 *
 * rankRecommendations(candidates, context)
 *   - Orders candidates by priority rules:
 *     1. Reliability tier (verified > established > emerging > unverified)
 *     2. Intake-need match count (more matched tags = higher)
 *     3. Proximity (closer first, when geo is available)
 *     4. Accepting clients (true before false)
 *   - Deterministic — no ML, no random, no scoring exposed.
 *
 * groupRecommendations(ranked)
 *   - Groups by category, preserving rank within each category.
 *
 * The engine never writes to intake, case, or program tables (read-only domain).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { searchProviders } from "@/lib/server/search/searchService";
import type { SearchFilter, SearchResult } from "@/lib/server/search/searchTypes";
import type {
  CandidateResource,
  RecommendationCategory,
  RecommendationContext,
  ReliabilityTier,
} from "./recommendationTypes";

// ---------------------------------------------------------------------------
// Category ↔ service-tag mapping
// ---------------------------------------------------------------------------

/**
 * Maps broad categories to the service tags indexed on provider_search_index.
 * Keeping this small and explicit — no dynamic taxonomy lookup in v1.
 */
const CATEGORY_TO_SERVICE_TAGS: Record<RecommendationCategory, string[]> = {
  legal: ["legal_aid", "civil_legal", "immigration_legal"],
  housing: ["housing", "emergency_shelter", "transitional_housing"],
  crisis: ["crisis_hotline", "emergency_response", "24_7_support"],
  counseling: ["counseling", "mental_health", "trauma_therapy"],
  financial: ["compensation", "financial_assistance", "emergency_funds"],
  medical: ["medical", "sane_exam", "forensic_medical"],
  advocacy: ["advocacy", "court_accompaniment", "case_management"],
  immigration: ["immigration_legal", "u_visa", "t_visa"],
  general: [],
};

/**
 * Collapses a set of categories into the deduped set of candidate service tags.
 * When no categories are provided, returns [] — filters must omit serviceTags.
 */
export function categoriesToServiceTags(
  categories: RecommendationCategory[],
): string[] {
  const tags = new Set<string>();
  for (const cat of categories) {
    for (const tag of CATEGORY_TO_SERVICE_TAGS[cat] ?? []) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
}

// ---------------------------------------------------------------------------
// Reliability tier derivation
// ---------------------------------------------------------------------------

/**
 * Maps a provider_search_index row to a display-only reliabilityTier.
 * This layer is where ranking_score would be interpreted IF it were exposed —
 * but the search repository intentionally does not expose it and never will.
 *
 * Current logic (v1):
 *   - acceptingClients === true && state matches → "established"
 *   - acceptingClients === true                 → "emerging"
 *   - otherwise                                  → "unverified"
 *
 * The "verified" tier is reserved for orgs with a trust grading pipeline
 * designation and is not surfaced yet — wiring pending Domain 0.5 signals.
 */
export function deriveReliabilityTier(row: SearchResult): ReliabilityTier {
  if (row.designationLevel && row.designationLevel.toLowerCase().includes("verified")) {
    return "verified";
  }
  if (row.acceptingClients) {
    return row.stateCodes.length > 0 ? "established" : "emerging";
  }
  return "unverified";
}

// ---------------------------------------------------------------------------
// fetchCandidateResources — provider_search_index only
// ---------------------------------------------------------------------------

/**
 * Fetches raw candidates for a recommendation run.
 *
 * CRITICAL: This function queries provider_search_index through the Domain
 * 0.6 search module. It must NEVER query organizations, programs, or
 * providers tables directly. The Search Law is enforced by delegating to
 * searchService.searchProviders which is itself policed.
 *
 * @param context   - Assembled recommendation context (location, intake tags)
 * @param supabase  - Supabase client (anon or admin — index is public-read)
 */
export async function fetchCandidateResources(
  context: RecommendationContext,
  supabase: SupabaseClient,
): Promise<CandidateResource[]> {
  const serviceTags = categoriesToServiceTags(context.intakeSignals.categories);
  // Include explicit tags captured from intake on top of category-derived ones.
  for (const tag of context.intakeSignals.serviceTags) {
    if (!serviceTags.includes(tag)) serviceTags.push(tag);
  }

  const filter: SearchFilter = {
    limit: 50,
  };
  if (context.location.stateCode) {
    filter.stateCodes = [context.location.stateCode];
  }
  if (serviceTags.length > 0) {
    filter.serviceTags = serviceTags;
  }
  if (context.location.lat != null && context.location.lng != null) {
    filter.geo = {
      lat: context.location.lat,
      lng: context.location.lng,
      radiusMiles: 50,
    };
  }

  const results = await searchProviders(filter, supabase);

  const excluded = new Set(context.excludedProviderIds);

  return results
    .filter((r) => !excluded.has(r.organizationId))
    .map((row) => ({
      organizationId: row.organizationId,
      name: row.name,
      description: row.description,
      stateCodes: row.stateCodes,
      serviceTags: row.serviceTags,
      languages: row.languages,
      acceptingClients: row.acceptingClients,
      capacityStatus: row.capacityStatus,
      distanceMiles: row.distanceMiles,
      reliabilityTier: deriveReliabilityTier(row),
      matchedTags: row.serviceTags.filter((t) => serviceTags.includes(t)),
    }));
}

// ---------------------------------------------------------------------------
// Ranking — deterministic ordering
// ---------------------------------------------------------------------------

const TIER_WEIGHT: Record<ReliabilityTier, number> = {
  verified: 4,
  established: 3,
  emerging: 2,
  unverified: 1,
};

/**
 * Orders candidates deterministically:
 *   1. Reliability tier (verified first)
 *   2. Intake-need match count (more matched tags first)
 *   3. Accepting clients (true first)
 *   4. Proximity (closer first, when both have a distance)
 *   5. Name alphabetical (stable fallback)
 *
 * Pure function — same input always produces same output.
 */
export function rankRecommendations(
  candidates: CandidateResource[],
  _context: RecommendationContext,
): CandidateResource[] {
  return [...candidates].sort((a, b) => {
    const tierDiff = TIER_WEIGHT[b.reliabilityTier] - TIER_WEIGHT[a.reliabilityTier];
    if (tierDiff !== 0) return tierDiff;

    const matchDiff = b.matchedTags.length - a.matchedTags.length;
    if (matchDiff !== 0) return matchDiff;

    if (a.acceptingClients !== b.acceptingClients) {
      return a.acceptingClients ? -1 : 1;
    }

    if (a.distanceMiles != null && b.distanceMiles != null) {
      const distDiff = a.distanceMiles - b.distanceMiles;
      if (distDiff !== 0) return distDiff;
    } else if (a.distanceMiles != null) {
      return -1;
    } else if (b.distanceMiles != null) {
      return 1;
    }

    return a.name.localeCompare(b.name);
  });
}

// ---------------------------------------------------------------------------
// Grouping — category buckets
// ---------------------------------------------------------------------------

/**
 * Groups an already-ranked list by category, preserving rank within each bucket.
 * Category is inferred from the first matching CATEGORY_TO_SERVICE_TAGS entry;
 * everything else falls into "general".
 */
export function groupRecommendations(
  ranked: CandidateResource[],
): Map<RecommendationCategory, CandidateResource[]> {
  const groups = new Map<RecommendationCategory, CandidateResource[]>();
  for (const cand of ranked) {
    const cat = inferCategory(cand);
    const bucket = groups.get(cat) ?? [];
    bucket.push(cand);
    groups.set(cat, bucket);
  }
  return groups;
}

/**
 * Infers the primary category for a candidate by checking its service tags
 * against CATEGORY_TO_SERVICE_TAGS in declaration order. Returns "general"
 * when nothing matches.
 */
export function inferCategory(candidate: CandidateResource): RecommendationCategory {
  const tagSet = new Set(candidate.serviceTags);
  for (const [cat, tags] of Object.entries(CATEGORY_TO_SERVICE_TAGS) as [
    RecommendationCategory,
    string[],
  ][]) {
    if (cat === "general") continue;
    if (tags.some((t) => tagSet.has(t))) return cat;
  }
  return "general";
}
