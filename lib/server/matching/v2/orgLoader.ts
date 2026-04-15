/**
 * Domain 3.4 — V2 matching: OrgForMatching loader.
 *
 * Reads active orgs + trust_signal_summary + provider_search_index, returns
 * the OrgForMatching[] shape consumed by `evaluateOrg`/`rankOrgs`. Respects
 * the 30-day private review window: orgs with public_display_active=false
 * surface as qualityTier='data_pending' regardless of their real tier.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  OrgForMatching,
  OrgTierType,
  QualityTierLabel,
} from "./matchingTypes";

export interface LoadOrgsFilters {
  stateCode?: string | null;
  originLat?: number | null;
  originLng?: number | null;
}

function coerceTier(raw: string | null | undefined): QualityTierLabel {
  const v = (raw ?? "").toLowerCase();
  if (
    v === "comprehensive" ||
    v === "established" ||
    v === "developing" ||
    v === "data_pending"
  )
    return v as QualityTierLabel;
  return "data_pending";
}

function coerceTierType(raw: string | null | undefined): OrgTierType {
  return raw === "tier_1_grassroots" ? "tier_1_grassroots" : "tier_2_social_service_agency";
}

function coerceCapacity(raw: string | null | undefined): OrgForMatching["capacityStatus"] {
  const v = (raw ?? "").toLowerCase();
  if (
    v === "open" ||
    v === "limited" ||
    v === "waitlist" ||
    v === "paused"
  )
    return v as OrgForMatching["capacityStatus"];
  return "unknown";
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export async function loadOrgsForMatching(
  filters: LoadOrgsFilters = {},
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<OrgForMatching[]> {
  // Pull candidate orgs — is_active + accepting_clients + a paused filter at
  // the service layer (V2's evaluateOrg hard-filters paused anyway).
  let q = supabase
    .from("organizations")
    .select(
      "id, name, status, org_tier_type, accepting_clients, capacity_status, service_types, program_types, coverage_area, languages, verified_languages",
    )
    .eq("status", "active")
    .limit(500);

  if (filters.stateCode) {
    // Coverage area is jsonb with a `states` array — filter client-side
    // since jsonb containment varies in support across envs.
    q = q;
  }

  const { data: orgs, error } = await q;
  if (error) throw new Error(error.message);

  const orgIds = (orgs ?? []).map((r) => (r as { id: string }).id);
  if (orgIds.length === 0) return [];

  // Join trust_signal_summary for quality_tier (respecting private review).
  const { data: summaries } = await supabase
    .from("trust_signal_summary")
    .select("organization_id, quality_tier, public_display_active")
    .in("organization_id", orgIds);

  const tierById = new Map<string, QualityTierLabel>();
  for (const r of (summaries ?? []) as Array<{
    organization_id: string;
    quality_tier: string | null;
    public_display_active: boolean | null;
  }>) {
    tierById.set(
      r.organization_id,
      r.public_display_active ? coerceTier(r.quality_tier) : "data_pending",
    );
  }

  // Distance: use provider_search_index (authoritative geo) when an origin
  // is provided. Compute haversine from cached lat/lng; PostGIS RPC is
  // overkill for an already-bounded set of orgIds.
  let distanceById = new Map<string, number>();
  if (
    filters.originLat != null &&
    filters.originLng != null &&
    Number.isFinite(filters.originLat) &&
    Number.isFinite(filters.originLng)
  ) {
    const { data: geo } = await supabase
      .from("provider_search_index")
      .select("org_id, lat, lng")
      .in("org_id", orgIds);
    for (const r of (geo ?? []) as Array<{
      org_id: string;
      lat: number | null;
      lng: number | null;
    }>) {
      if (r.lat != null && r.lng != null) {
        const km = haversineKm(
          [filters.originLat!, filters.originLng!],
          [r.lat, r.lng],
        );
        distanceById.set(r.org_id, km);
      }
    }
  }

  return (orgs ?? []).map((raw) => {
    const r = raw as {
      id: string;
      name: string;
      org_tier_type: string | null;
      accepting_clients: boolean | null;
      capacity_status: string | null;
      service_types: string[] | null;
      program_types: string[] | null;
      coverage_area: Record<string, unknown> | null;
      languages: string[] | null;
      verified_languages: string[] | null;
    };
    const coverage = r.coverage_area ?? {};
    return {
      id: r.id,
      orgTierType: coerceTierType(r.org_tier_type),
      serviceTypes: Array.isArray(r.service_types) ? r.service_types : [],
      programTypes: Array.isArray(r.program_types) ? r.program_types : [],
      coverageZips: Array.isArray((coverage as { zips?: string[] }).zips)
        ? ((coverage as { zips: string[] }).zips as string[])
        : [],
      coverageCounties: Array.isArray((coverage as { counties?: string[] }).counties)
        ? ((coverage as { counties: string[] }).counties as string[])
        : [],
      coverageStates: Array.isArray((coverage as { states?: string[] }).states)
        ? ((coverage as { states: string[] }).states as string[])
        : [],
      acceptingClients: r.accepting_clients !== false,
      capacityStatus: coerceCapacity(r.capacity_status),
      languages: Array.isArray(r.languages) ? r.languages : [],
      verifiedLanguages: Array.isArray(r.verified_languages) ? r.verified_languages : [],
      distanceKm: distanceById.get(r.id) ?? null,
      qualityTier: tierById.get(r.id) ?? null,
    };
  });
}
