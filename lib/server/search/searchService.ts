/**
 * Domain 0.6 — Search Infrastructure (PostGIS): service layer.
 *
 * searchProviders() — composite search (text + geo + filters).
 * searchByGeo()     — convenience wrapper for geo-only proximity search.
 *
 * Distance computation is performed here using lib/geo/haversine.ts
 * after rows are returned from the index, avoiding SQL-level RPC overhead.
 * Results are sorted by distance (nearest first) when a geo filter is applied.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SearchFilter, SearchResult, GeoFilter } from "./searchTypes";
import { querySearchIndex } from "./searchRepository";
import { distanceMiles } from "@/lib/server/geo/haversine";

/**
 * Search providers using any combination of text, geo, state, and service filters.
 *
 * Geo distance (distanceMiles) is computed in application code from returned
 * lat/lng values using the Haversine formula. Results are sorted nearest-first
 * when a geo filter is present.
 *
 * @param filter   - Composite search filter. Empty object returns all active providers.
 * @param supabase - Supabase client (anon or admin — index is public-read).
 */
export async function searchProviders(
  filter: SearchFilter,
  supabase: SupabaseClient,
): Promise<SearchResult[]> {
  const results = await querySearchIndex(filter, supabase);

  // Compute and attach distanceMiles from the caller's origin when geo filter present.
  if (filter.geo) {
    const { lat: originLat, lng: originLng } = filter.geo;
    const withDistance = results.map((r) => {
      if (r.lat == null || r.lng == null || r.approximate) {
        return { ...r, distanceMiles: null };
      }
      return {
        ...r,
        distanceMiles: distanceMiles(originLat, originLng, r.lat, r.lng),
      };
    });
    // Sort nearest-first.
    return withDistance.sort((a, b) => {
      if (a.distanceMiles == null) return 1;
      if (b.distanceMiles == null) return -1;
      return a.distanceMiles - b.distanceMiles;
    });
  }

  return results;
}

/**
 * Convenience wrapper: geo-only proximity search.
 * Returns providers within radiusMiles, sorted nearest-first.
 * Approximate-coord orgs (state centroid) are excluded (Decision 4).
 *
 * @param geo      - { lat, lng, radiusMiles }
 * @param supabase - Supabase client.
 */
export async function searchByGeo(
  geo: GeoFilter,
  supabase: SupabaseClient,
): Promise<SearchResult[]> {
  return searchProviders({ geo }, supabase);
}
