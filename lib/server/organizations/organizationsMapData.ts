/**
 * Shared payload for applicant/advocate "find organizations" map APIs.
 *
 * Domain 3.4 — Search Law compliance: loadOrganizationsMapRows() reads from
 * provider_search_index instead of the organizations table directly.
 * Orgs must pass canOrganizationAppearInSearch() (is_active=true in index) to appear.
 *
 * Merges geocoded rows from `data/il-cbo-va-2026.json` (built by
 * `scripts/build-il-cbo-va-directory.mjs`) for directory pins without Supabase ids.
 */

import fs from "fs";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { regionLabelForOrg } from "@/lib/server/ecosystem/regions";
import { distanceMiles, milesToMeters, metersToMiles } from "@/lib/server/geo/haversine";
import type { ResponseAccessibilityPublic } from "@/lib/organizations/responseAccessibilityPublic";

export type OrganizationMapRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  approximate: boolean;
  accepting_clients: boolean;
  capacity_status: string;
  region_label: string;
  states: string[];
  /** Spreadsheet / static directory row — referrals and org join are disabled. */
  external?: boolean;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  program_type?: string | null;
  /** Populated for NxtStps organizations; null for external directory rows. */
  response_accessibility?: ResponseAccessibilityPublic | null;
  /**
   * Populated only when the caller provided an origin (lat/lng) to
   * loadOrganizationsMapRowsNear. Derived from PostGIS ST_Distance for index
   * rows and from a server-side haversine for static directory rows. Never
   * computed client-side.
   */
  distance_miles?: number | null;
};

export type GeoOrigin = {
  lat: number;
  lng: number;
  /** Radius in miles. Defaults to 50mi (~80km) when omitted. */
  radiusMiles?: number;
  /** Result cap. Defaults to 500. */
  limit?: number;
};

type CboVaFile = {
  entries?: Array<{
    id: string;
    name: string;
    program_type?: string;
    address: string;
    phone?: string | null;
    website?: string | null;
    lat: number | null;
    lng: number | null;
    geocode_ok?: boolean;
  }>;
};

function cleanDirectoryPhone(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  const digits = t.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return t;
}

function inferStatesFromAddress(address: string): string[] {
  const m = address.match(/\b([A-Z]{2})\s+\d{5}(?:-\d{4})?\s*$/i);
  if (m) return [m[1].toUpperCase()];
  return [];
}

function regionLabelForExternal(address: string, states: string[]): string {
  if (states.length === 1) return states[0];
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join(", ");
  return address.length > 90 ? `${address.slice(0, 87)}…` : address;
}

/**
 * Returns true for IDs that belong to the external CBO/VA directory
 * (prefix-based — internal NxtStps orgs use UUIDs and never collide with this prefix).
 */
export function isExternalDirectoryId(id: string): boolean {
  return typeof id === "string" && id.startsWith("ext:");
}

/**
 * Loads a single external directory entry by id. Returns null if the
 * directory file is missing, the id is not present, or the entry is not geocoded.
 * The map view depends on geocode_ok being true; we keep that requirement here
 * for consistency, since a non-geocoded row would not be reachable from the map.
 */
export function getExternalOrganizationById(id: string): OrganizationMapRow | null {
  if (!isExternalDirectoryId(id)) return null;
  const rows = loadCboVaMapRows();
  return rows.find((r) => r.id === id) ?? null;
}

function loadCboVaMapRows(): OrganizationMapRow[] {
  const jsonPath = path.join(process.cwd(), "data", "il-cbo-va-2026.json");
  if (!fs.existsSync(jsonPath)) return [];
  let parsed: CboVaFile;
  try {
    parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as CboVaFile;
  } catch {
    return [];
  }
  const entries = parsed.entries ?? [];
  const out: OrganizationMapRow[] = [];
  for (const e of entries) {
    if (!e.geocode_ok) continue;
    if (e.lat == null || e.lng == null) continue;
    if (!Number.isFinite(e.lat) || !Number.isFinite(e.lng)) continue;
    const states = inferStatesFromAddress(e.address);
    out.push({
      id: e.id,
      name: e.name,
      lat: e.lat,
      lng: e.lng,
      approximate: false,
      accepting_clients: false,
      capacity_status: "unknown",
      region_label: regionLabelForExternal(e.address, states),
      states,
      external: true,
      address: e.address,
      phone: cleanDirectoryPhone(e.phone ?? null),
      website: e.website?.trim() || null,
      program_type: e.program_type?.trim() || null,
      response_accessibility: null,
    });
  }
  return out;
}

export function isOrganizationMapListable(row: {
  status?: string | null;
  lifecycle_status?: string | null;
  public_profile_status?: string | null;
  profile_status?: string | null;
  name?: string | null;
}): boolean {
  if ((row.status ?? "").trim() !== "active") return false;
  const life = (row.lifecycle_status ?? "").trim();
  if (life !== "managed" && life !== "seeded") return false;
  const pub = (row.public_profile_status ?? "").trim();
  if (!["active", "pending_review", "draft"].includes(pub)) return false;
  const ps = (row.profile_status ?? "").trim();
  if (ps !== "active" && ps !== "draft") return false;
  return Boolean(row.name?.trim());
}

export async function loadOrganizationsMapRows(): Promise<OrganizationMapRow[]> {
  // Search Law: read from provider_search_index only — no direct organizations query.
  // Orgs appear here only after passing canOrganizationAppearInSearch() (is_active=true in index).
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("provider_search_index")
    .select(
      "org_id,name,state_codes,accepting_clients,capacity_status,approximate,lat,lng,address,phone,website"
    )
    .eq("is_active", true)
    .limit(500);

  if (error) throw new Error(error.message);

  const dbRows: OrganizationMapRow[] = (data ?? []).map((row) => ({
    id: row.org_id as string,
    name: row.name as string,
    lat: typeof row.lat === "number" ? row.lat : 0,
    lng: typeof row.lng === "number" ? row.lng : 0,
    approximate: Boolean(row.approximate),
    accepting_clients: Boolean(row.accepting_clients),
    capacity_status: (row.capacity_status as string | null) ?? "unknown",
    region_label: regionLabelForOrg(
      Array.isArray(row.state_codes) ? (row.state_codes as string[]) : [],
      [] // county data not available in search index
    ),
    states: Array.isArray(row.state_codes) ? (row.state_codes as string[]) : [],
    address: (row.address as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    response_accessibility: null, // [DEFERRED-3.4-002]: not in search index; requires org join
  }));

  const cboRows = loadCboVaMapRows();
  return [...dbRows, ...cboRows];
}

/**
 * Geo-aware variant: PostGIS filters + sorts index rows by distance from origin,
 * and the static CBO/VA directory rows are distance-computed server-side and
 * merged in. Returns rows sorted by ascending distance.
 *
 * Search Law: geo filtering never happens in the browser — callers must pass
 * origin coords that came from a server-side geocode or a user-granted
 * geolocation, and the frontend consumes the already-filtered result.
 */
export async function loadOrganizationsMapRowsNear(
  origin: GeoOrigin,
): Promise<OrganizationMapRow[]> {
  const radiusMiles = origin.radiusMiles ?? 50;
  const radiusMeters = milesToMeters(radiusMiles);
  const limit = origin.limit ?? 500;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("search_providers_near", {
    p_lat: origin.lat,
    p_lng: origin.lng,
    p_radius_meters: radiusMeters,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);

  const dbRows: OrganizationMapRow[] = (data ?? []).map(
    (row: Record<string, unknown>) => ({
      id: row.org_id as string,
      name: row.name as string,
      lat: typeof row.lat === "number" ? row.lat : 0,
      lng: typeof row.lng === "number" ? row.lng : 0,
      approximate: Boolean(row.approximate),
      accepting_clients: Boolean(row.accepting_clients),
      capacity_status: (row.capacity_status as string | null) ?? "unknown",
      region_label: regionLabelForOrg(
        Array.isArray(row.state_codes) ? (row.state_codes as string[]) : [],
        [],
      ),
      states: Array.isArray(row.state_codes) ? (row.state_codes as string[]) : [],
      address: (row.address as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      website: (row.website as string | null) ?? null,
      response_accessibility: null,
      distance_miles:
        typeof row.distance_meters === "number"
          ? metersToMiles(row.distance_meters)
          : null,
    }),
  );

  // Static directory rows: not in PostGIS, so distance is computed server-side.
  const cboRows = loadCboVaMapRows()
    .map((row) => ({
      ...row,
      distance_miles: distanceMiles(origin.lat, origin.lng, row.lat, row.lng),
    }))
    .filter((row) => (row.distance_miles ?? Infinity) <= radiusMiles);

  return [...dbRows, ...cboRows].sort((a, b) => {
    const da = a.distance_miles ?? Infinity;
    const db = b.distance_miles ?? Infinity;
    return da - db;
  });
}
