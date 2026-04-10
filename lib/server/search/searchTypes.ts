/**
 * Domain 0.6 — Search Infrastructure (PostGIS): canonical types.
 *
 * Data class: C — Controlled Business (search index) / Public (results).
 * The provider_search_index table is read-only for authenticated users.
 * Only indexSync.ts may populate it from the organizations table.
 */

/**
 * Geographic proximity filter.
 * radiusMiles is converted to meters internally before passing to ST_DWithin.
 */
export interface GeoFilter {
  lat: number;
  lng: number;
  /** Search radius in miles. Converted to meters (× 1609.34) for ST_DWithin. */
  radiusMiles: number;
}

/**
 * Composite search filter. All fields are optional.
 * At least one field should be set; empty object returns all active orgs.
 */
export interface SearchFilter {
  /** Free-text query — matched against the search_vector tsvector column. */
  query?: string;
  /** Geo proximity filter — uses ST_DWithin against provider_search_index.location. */
  geo?: GeoFilter;
  /** Narrow results to orgs with at least one matching state code. */
  stateCodes?: string[];
  /** Narrow results to orgs with at least one matching service tag. */
  serviceTags?: string[];
  /** Max results to return (default 50). */
  limit?: number;
  /** Offset for pagination (default 0). */
  offset?: number;
}

/**
 * A single provider returned by searchProviders() or searchByGeo().
 * All fields are sourced from provider_search_index — never from organizations.
 */
export interface SearchResult {
  organizationId: string;
  name: string;
  /** Always null in Domain 0.6 — no description column on organizations yet. */
  description: string | null;
  /**
   * Distance from the geo filter origin, in miles.
   * Null when no geo filter was applied or org has approximate coordinates.
   */
  distanceMiles: number | null;
  /**
   * True when coordinates are derived from state centroid (not real address).
   * Approximate-coord orgs are excluded from geo radius search.
   */
  approximate: boolean;
  /** Denormalized quality tier score. Null until grading pipeline is wired. */
  trustScore: number | null;
  /** Denormalized designation tier label. Null until designation pipeline is wired. */
  designationLevel: string | null;
  stateCodes: string[];
  serviceTags: string[];
  languages: string[];
  acceptingClients: boolean;
  capacityStatus: string | null;
  lat: number | null;
  lng: number | null;
}

/** Parameters for syncOrgToIndex(). */
export interface IndexSyncParams {
  organizationId: string;
}
