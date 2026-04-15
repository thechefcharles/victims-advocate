/**
 * Domain 3.4 — Public provider search.
 *
 * Calls the PostGIS `search_providers_near` RPC (Sprint 1) and joins the
 * per-org `trust_signal_summary` to expose the canonical quality_tier.
 *
 * PUBLIC READ PATH — never returns overall_score, raw signal values, admin
 * metadata, or internal notes. Only the shape documented below is emitted.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { milesToMeters } from "@/lib/server/geo/haversine";

export type QualityTier =
  | "comprehensive"
  | "established"
  | "developing"
  | "data_pending";

export type CapacityStatus = "open" | "limited" | "waitlist" | "paused";

export interface ProviderSearchResultRow {
  organizationId: string;
  name: string;
  distanceKm: number;
  serviceTypes: string[];
  languages: string[];
  acceptingClients: boolean;
  capacityStatus: CapacityStatus;
  qualityTier: QualityTier;
}

export interface ProviderSearchResult {
  providers: ProviderSearchResultRow[];
  nextCursor: string | null;
  limit: number;
  totalInRadius: number | null;
}

const KM_TO_MI = 1 / 1.609344;
const METERS_PER_KM = 1000;

function kmToMeters(km: number): number {
  // Reuse miles→meters helper via conversion — avoids a second constant.
  return milesToMeters(km * KM_TO_MI);
}

function coerceCapacity(raw: string | null | undefined): CapacityStatus {
  const v = (raw ?? "").toLowerCase();
  if (v === "open" || v === "limited" || v === "waitlist" || v === "paused") return v;
  return "open";
}

function coerceTier(raw: string | null | undefined): QualityTier {
  const v = (raw ?? "").toLowerCase();
  if (
    v === "comprehensive" ||
    v === "established" ||
    v === "developing" ||
    v === "data_pending"
  )
    return v as QualityTier;
  return "data_pending";
}

export interface SearchProvidersParams {
  lat: number;
  lng: number;
  radiusKm: number;
  serviceTypes?: string[];
  crimeType?: string;
  language?: string;
  acceptingClients?: boolean;
  cursor?: string | null;
  limit: number;
}

/**
 * Cursor format: base64("<orgId>|<distanceKm>"). Encodes the last org id on
 * the previous page so the RPC can skip past it on the next call.
 */
function encodeCursor(orgId: string, distanceKm: number): string {
  return Buffer.from(`${orgId}|${distanceKm.toFixed(6)}`).toString("base64");
}

function decodeCursor(cursor: string | null | undefined): { orgId: string; distanceKm: number } | null {
  if (!cursor) return null;
  try {
    const s = Buffer.from(cursor, "base64").toString("utf8");
    const [orgId, distStr] = s.split("|");
    const d = Number.parseFloat(distStr ?? "");
    if (!orgId || !Number.isFinite(d)) return null;
    return { orgId, distanceKm: d };
  } catch {
    return null;
  }
}

export async function searchProviders(
  params: SearchProvidersParams,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ProviderSearchResult> {
  const limit = Math.min(50, Math.max(1, params.limit));
  const radiusKm = Math.min(100, Math.max(0.1, params.radiusKm));
  const radiusMeters = kmToMeters(radiusKm);

  // Ask the RPC for up to 500 rows in the radius — we filter in-memory on the
  // service-specific dimensions (service_types, language, crime_type) then
  // apply the cursor + page cap. The RPC already excludes approximate rows
  // and filters is_active=true.
  const { data, error } = await supabase.rpc("search_providers_near", {
    p_lat: params.lat,
    p_lng: params.lng,
    p_radius_meters: radiusMeters,
    p_limit: 500,
  });
  if (error) throw new Error(error.message);

  type Row = {
    org_id: string;
    name: string;
    state_codes: string[] | null;
    accepting_clients: boolean | null;
    capacity_status: string | null;
    distance_meters: number;
  };
  const baseRows = ((data ?? []) as Row[]).map((r) => ({
    organizationId: String(r.org_id),
    name: String(r.name),
    distanceKm: Number(r.distance_meters) / METERS_PER_KM,
    acceptingClients: r.accepting_clients !== false,
    capacityStatus: coerceCapacity(r.capacity_status),
  }));

  if (baseRows.length === 0) {
    return { providers: [], nextCursor: null, limit, totalInRadius: 0 };
  }

  // Pull service_tags / languages / quality tiers for this batch.
  const orgIds = baseRows.map((r) => r.organizationId);
  const [{ data: indexRows }, { data: summaryRows }] = await Promise.all([
    supabase
      .from("provider_search_index")
      .select("org_id, service_tags, languages")
      .in("org_id", orgIds),
    supabase
      .from("trust_signal_summary")
      .select("organization_id, quality_tier, public_display_active")
      .in("organization_id", orgIds),
  ]);

  const indexById = new Map<string, { serviceTypes: string[]; languages: string[] }>();
  for (const r of (indexRows ?? []) as Array<{
    org_id: string;
    service_tags: string[] | null;
    languages: string[] | null;
  }>) {
    indexById.set(r.org_id, {
      serviceTypes: Array.isArray(r.service_tags) ? r.service_tags : [],
      languages: Array.isArray(r.languages) ? r.languages : [],
    });
  }

  const tierById = new Map<string, QualityTier>();
  for (const r of (summaryRows ?? []) as Array<{
    organization_id: string;
    quality_tier: string | null;
    public_display_active: boolean | null;
  }>) {
    // Only surface a tier when the 30-day private-review window has closed.
    tierById.set(
      r.organization_id,
      r.public_display_active ? coerceTier(r.quality_tier) : "data_pending",
    );
  }

  // Assemble enriched rows, then apply in-memory filters.
  const enriched = baseRows
    .map((r) => ({
      ...r,
      serviceTypes: indexById.get(r.organizationId)?.serviceTypes ?? [],
      languages: indexById.get(r.organizationId)?.languages ?? [],
      qualityTier: tierById.get(r.organizationId) ?? "data_pending",
    }))
    .filter((r) => {
      if (params.acceptingClients !== false && !r.acceptingClients) return false;
      if (params.serviceTypes && params.serviceTypes.length > 0) {
        const want = params.serviceTypes.map((s) => s.toLowerCase());
        const have = new Set(r.serviceTypes.map((s) => s.toLowerCase()));
        if (!want.some((w) => have.has(w))) return false;
      }
      if (params.language) {
        const want = params.language.toLowerCase();
        if (!r.languages.some((l) => l.toLowerCase() === want)) return false;
      }
      // crime_type filter: mapped to service_tags for now — a dedicated
      // crime_types_served column on the index would be a future enhancement.
      if (params.crimeType) {
        const want = params.crimeType.toLowerCase();
        const have = new Set(r.serviceTypes.map((s) => s.toLowerCase()));
        if (!have.has(want)) return false;
      }
      return true;
    });

  // Apply cursor skip — skip everything up to and including the cursor org.
  const decoded = decodeCursor(params.cursor ?? null);
  const start = decoded
    ? enriched.findIndex((r) => r.organizationId === decoded.orgId) + 1
    : 0;
  const window = enriched.slice(start, start + limit + 1);
  const hasMore = window.length > limit;
  const page = hasMore ? window.slice(0, limit) : window;

  return {
    providers: page.map((r) => ({
      organizationId: r.organizationId,
      name: r.name,
      distanceKm: Math.round(r.distanceKm * 100) / 100,
      serviceTypes: r.serviceTypes,
      languages: r.languages,
      acceptingClients: r.acceptingClients,
      capacityStatus: r.capacityStatus,
      qualityTier: r.qualityTier,
    })),
    nextCursor: hasMore
      ? encodeCursor(page[page.length - 1]!.organizationId, page[page.length - 1]!.distanceKm)
      : null,
    limit,
    // Known only when we didn't hit the 500-row RPC cap.
    totalInRadius: enriched.length < 500 ? enriched.length : null,
  };
}
