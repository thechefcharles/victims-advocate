/**
 * Domain 0.6 — Search Infrastructure (PostGIS): data access layer.
 *
 * Search Law: this file NEVER queries the organizations table.
 * All reads go through provider_search_index only.
 *
 * PostGIS filters:
 *   - Full-text: search_vector (GIN index, tsvector generated column)
 *   - Geo radius: location (GIST index, geography(Point,4326))
 *     ST_DWithin filter via PostgREST 'st_dwithin' operator.
 *     approximate=false guard: state-centroid orgs are excluded from geo search.
 *
 * Distance computation (distanceMiles) is performed in the service layer
 * using lib/geo/haversine.ts — not in SQL — to avoid RPC overhead.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SearchFilter, SearchResult } from "./searchTypes";

type IndexRow = {
  org_id: string;
  name: string;
  description: string | null;
  service_tags: string[];
  state_codes: string[];
  languages: string[];
  accepting_clients: boolean;
  capacity_status: string | null;
  approximate: boolean;
  lat: number | null;
  lng: number | null;
  is_active: boolean;
};

function rowToResult(row: IndexRow): SearchResult {
  return {
    organizationId: row.org_id,
    name: row.name,
    description: row.description,
    distanceMiles: null, // computed by service layer when geo filter applied
    approximate: row.approximate,
    trustScore: null,
    designationLevel: null,
    stateCodes: row.state_codes ?? [],
    serviceTags: row.service_tags ?? [],
    languages: row.languages ?? [],
    acceptingClients: row.accepting_clients,
    capacityStatus: row.capacity_status,
    lat: row.lat,
    lng: row.lng,
  };
}

/**
 * Executes the search query against provider_search_index.
 *
 * CRITICAL: This function may NEVER query the organizations table.
 * All discovery data must come from the pre-indexed provider_search_index.
 *
 * @param filter  - Composite search filter (text, geo, state, service).
 * @param supabase - Admin or anon Supabase client (index is public-read).
 */
export async function querySearchIndex(
  filter: SearchFilter,
  supabase: SupabaseClient,
): Promise<SearchResult[]> {
  const limit = filter.limit ?? 50;
  const offset = filter.offset ?? 0;

  let query = supabase
    .from("provider_search_index")
    .select(
      "org_id,name,description,service_tags,state_codes,languages,accepting_clients,capacity_status,approximate,lat,lng",
    )
    .eq("is_active", true);

  // Full-text search via tsvector generated column + GIN index.
  if (filter.query?.trim()) {
    query = query.textSearch("search_vector", filter.query.trim(), {
      type: "plain",
      config: "english",
    });
  }

  // Geo radius filter via PostGIS ST_DWithin (GIST index on location).
  // radiusMiles → meters for ST_DWithin (Decision 7).
  // approximate=false: orgs with state-centroid coords excluded from geo search (Decision 4).
  if (filter.geo) {
    const { lat, lng, radiusMiles } = filter.geo;
    const radiusMeters = radiusMiles * 1609.34;
    // PostgREST st_dwithin filter: GeoJSON point + radius in meters.
    const geoJsonPoint = JSON.stringify({ type: "Point", coordinates: [lng, lat] });
    query = query
      .filter("location", "st_dwithin", `${geoJsonPoint},${radiusMeters}`)
      .eq("approximate", false);
  }

  // Array containment filters (GIN indexes on service_tags, state_codes).
  if (filter.stateCodes && filter.stateCodes.length > 0) {
    query = query.contains("state_codes", filter.stateCodes);
  }
  if (filter.serviceTags && filter.serviceTags.length > 0) {
    query = query.contains("service_tags", filter.serviceTags);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Search index query failed: ${error.message}`);
  }

  return (data ?? []).map((row) => rowToResult(row as IndexRow));
}
