/**
 * Domain 5.2 — Recommendation cache repository (OPTIONAL / DEFERRED in v1).
 *
 * The recommendation_cache table is an optional performance layer. In v1
 * we ship the service without it — every call goes through generation.
 * This file is kept as the single seam where caching would be wired in,
 * so when the table lands in a future migration we can flip getRecommendations
 * to check cache first without touching any caller.
 *
 * Both functions below are no-ops that return null / void by design.
 * Tests assert that the service still works when the cache returns null.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecommendationSet } from "./recommendationTypes";

/**
 * Looks up a cached recommendation set for (userId, contextHash). Returns
 * null when no entry exists, or when the cache table is not yet provisioned.
 * Callers must treat null as "generate fresh".
 */
export async function getCachedRecommendations(
  _userId: string,
  _contextHash: string,
  _supabase: SupabaseClient,
): Promise<RecommendationSet | null> {
  // DEFERRED: recommendation_cache table is not provisioned in v1.
  // When it lands, query it here and return the parsed row.
  return null;
}

/**
 * Persists a generated RecommendationSet to the cache keyed on
 * (userId, contextHash). No-op until the cache table is provisioned.
 */
export async function cacheRecommendationSet(
  _userId: string,
  _contextHash: string,
  _set: RecommendationSet,
  _supabase: SupabaseClient,
): Promise<void> {
  // DEFERRED: intentionally empty until recommendation_cache ships.
}
