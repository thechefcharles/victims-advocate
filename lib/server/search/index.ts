/**
 * Domain 0.6 — Search Infrastructure (PostGIS) public surface.
 *
 * Import everything from here:
 *   import { searchProviders, searchByGeo, syncOrgToIndex } from "@/lib/server/search"
 *   import type { SearchFilter, SearchResult, GeoFilter } from "@/lib/server/search"
 *
 * Search Law: only indexSync.ts may read from organizations.
 *             All search queries go through provider_search_index only.
 */

export { searchProviders, searchByGeo } from "./searchService";
export { syncOrgToIndex, backfillSearchIndex } from "./indexSync";
export type {
  GeoFilter,
  SearchFilter,
  SearchResult,
  IndexSyncParams,
} from "./searchTypes";
