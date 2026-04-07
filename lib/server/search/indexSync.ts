/**
 * Domain 0.6 — Search Infrastructure (PostGIS): index sync.
 *
 * syncOrgToIndex() is the ONLY function permitted to read from the organizations
 * table and write to provider_search_index. All other search layer code must
 * read from provider_search_index exclusively (Search Law).
 *
 * Visibility rule: uses canOrganizationAppearInSearch() — the strict rule.
 *   Requires: status=active, lifecycle_status=managed, public_profile_status=active,
 *             profile_status=active, profile_stage=searchable|enriched.
 * See lib/organizations/profileStage.ts for the full gate definition.
 *
 * Coordinate derivation (Decision 6):
 *   Uses computeOrgMapPoint() — same 3-tier logic as the map routes:
 *     1. metadata JSONB: public_lat/public_lng (or map_lat/map_lng, latitude/longitude, etc.)
 *     2. coverage_area JSONB: lat/lng or center.lat/lng
 *     3. State centroid fallback → approximate = true
 *   Approximate orgs: lat/lng stored, location (geography) set to NULL.
 *   They appear in text search but are excluded from geo radius queries.
 *
 * Note: backfillSearchIndex() should be called once after Domain 0.6 deploys
 * to seed the index for all existing organizations. After that, call
 * syncOrgToIndex() explicitly from org profile update handlers.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { IndexSyncParams } from "./searchTypes";
import { canOrganizationAppearInSearch } from "@/lib/organizations/profileStage";
import { computeOrgMapPoint } from "@/lib/server/organizations/mapCoordinates";

type OrgRow = {
  id: string;
  name: string;
  status: string;
  lifecycle_status: string;
  public_profile_status: string;
  profile_status: string;
  profile_stage: string;
  service_types: string[];
  languages: string[];
  coverage_area: unknown;
  metadata: unknown;
  capacity_status: string;
  accepting_clients: boolean;
  states_of_operation: string[];
};

/**
 * Syncs a single organization to the provider_search_index.
 *
 * This is the ONE permitted read from the organizations table in the search domain.
 * All other search queries go through provider_search_index only.
 *
 * If the org is not eligible for search (per canOrganizationAppearInSearch),
 * it is marked is_active=false in the index (or deleted if no row exists).
 *
 * @param params   - { organizationId }
 * @param supabase - Admin Supabase client (service role required for upsert).
 */
export async function syncOrgToIndex(
  params: IndexSyncParams,
  supabase: SupabaseClient,
): Promise<void> {
  const { organizationId } = params;

  // Step 1: Fetch org from organizations table.
  // This is the ONE allowed organizations query in the search domain.
  const { data: org, error: fetchErr } = await supabase
    .from("organizations")
    .select(
      "id,name,status,lifecycle_status,public_profile_status,profile_status,profile_stage,service_types,languages,coverage_area,metadata,capacity_status,accepting_clients,states_of_operation",
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (fetchErr) throw new Error(`syncOrgToIndex fetch failed: ${fetchErr.message}`);

  if (!org) {
    // Org deleted — remove from index if present.
    await supabase.from("provider_search_index").delete().eq("org_id", organizationId);
    return;
  }

  // Step 2: Check visibility using the strict canOrganizationAppearInSearch() rule (Decision 5).
  // This requires: status=active, lifecycle_status=managed, public_profile_status=active,
  // profile_status=active, profile_stage=searchable|enriched.
  const row = org as OrgRow;
  const isEligible = canOrganizationAppearInSearch({
    status: row.status,
    lifecycle_status: row.lifecycle_status,
    public_profile_status: row.public_profile_status,
    profile_status: row.profile_status,
    profile_stage: row.profile_stage,
  });

  if (!isEligible) {
    // Mark as inactive rather than delete — preserves history and allows reactivation.
    const { data: existing } = await supabase
      .from("provider_search_index")
      .select("id")
      .eq("org_id", organizationId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("provider_search_index")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("org_id", organizationId);
    }
    return;
  }

  // Step 3: Derive coordinates using computeOrgMapPoint() (Decision 6).
  // Same 3-tier fallback logic as the map routes:
  //   metadata JSONB keys → coverage_area JSONB → state centroid (approximate=true)
  const { lat, lng, approximate } = computeOrgMapPoint({
    id: row.id,
    coverage_area: row.coverage_area,
    metadata: row.metadata,
  });

  // Step 4: Derive state codes.
  // Prefer the typed states_of_operation column; fall back to an empty array.
  // (coverage_area.states is the legacy source — the states_of_operation column
  //  was added in ORG-1A and should be authoritative going forward.)
  const stateCodes =
    Array.isArray(row.states_of_operation) && row.states_of_operation.length > 0
      ? row.states_of_operation
      : [];

  // Step 5: Build location geography value.
  // For approximate coords (state centroid fallback): set location = NULL.
  // These orgs appear in text search but are excluded from geo radius queries.
  // For real coords: pass as WKT POINT(lng lat) — PostgREST casts to geography(Point,4326).
  const locationValue = approximate ? null : `POINT(${lng} ${lat})`;

  // Step 6: Upsert into provider_search_index ON CONFLICT (org_id).
  // search_vector is computed by the trg_search_vector_update trigger (BEFORE INSERT OR UPDATE).
  // Do NOT include it in the payload — the trigger derives it from name/service_tags/state_codes/languages.
  // (GENERATED ALWAYS AS cannot use to_tsvector() because it is STABLE not IMMUTABLE.)
  const { error: upsertErr } = await supabase.from("provider_search_index").upsert(
    {
      org_id: row.id,
      name: row.name,
      description: null, // Decision 2: no description column yet; Domain 3.2 will add it
      service_tags: Array.isArray(row.service_types) ? row.service_types : [],
      state_codes: stateCodes,
      languages: Array.isArray(row.languages) ? row.languages : [],
      accepting_clients: row.accepting_clients,
      capacity_status: row.capacity_status ?? null,
      lifecycle_status: row.lifecycle_status ?? null,
      public_profile_status: row.public_profile_status ?? null,
      profile_stage: row.profile_stage ?? null,
      lat: lat,
      lng: lng,
      location: locationValue,
      approximate,
      is_active: true,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );

  if (upsertErr) {
    throw new Error(`syncOrgToIndex upsert failed: ${upsertErr.message}`);
  }
}

/**
 * One-time backfill: syncs all existing organizations to the search index.
 *
 * Call this once after Domain 0.6 deploys to seed provider_search_index.
 * After the initial backfill, use syncOrgToIndex() explicitly from profile
 * update handlers to keep the index current.
 *
 * @param supabase - Admin Supabase client (service role required).
 * @returns        Counts of synced and skipped (ineligible) organizations.
 */
export async function backfillSearchIndex(
  supabase: SupabaseClient,
): Promise<{ synced: number; skipped: number }> {
  // Fetch all org IDs — backfill handles eligibility check internally.
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("status", "active");

  if (error) throw new Error(`backfillSearchIndex fetch failed: ${error.message}`);

  const orgIds = (data ?? []).map((r: { id: string }) => r.id);

  let synced = 0;
  let skipped = 0;

  for (const organizationId of orgIds) {
    try {
      // syncOrgToIndex handles eligibility — ineligible orgs are marked inactive.
      // We count "skipped" based on whether the org ends up is_active in the index.
      await syncOrgToIndex({ organizationId }, supabase);

      const { data: row } = await supabase
        .from("provider_search_index")
        .select("is_active")
        .eq("org_id", organizationId)
        .maybeSingle();

      if (row?.is_active) {
        synced++;
      } else {
        skipped++;
      }
    } catch {
      skipped++;
    }
  }

  return { synced, skipped };
}
