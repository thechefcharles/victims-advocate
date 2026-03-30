/**
 * Shared payload for victim/advocate “find organizations” map APIs.
 *
 * Uses a broader visibility rule than case matching: includes seeded / draft-profile
 * partners so manually added directory orgs still appear on the map while they finish
 * onboarding. Case matching and recommendations still use `canOrganizationAppearInSearch`.
 *
 * Merges geocoded rows from `data/il-cbo-va-2026.json` (built by
 * `scripts/build-il-cbo-va-directory.mjs`) for directory pins without Supabase ids.
 */

import fs from "fs";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  countiesFromCoverage,
  regionLabelForOrg,
  statesFromCoverage,
} from "@/lib/server/ecosystem/regions";
import { computeOrgMapPoint } from "@/lib/server/organizations/mapCoordinates";

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
    });
  }
  return out;
}

function isOrganizationMapListable(row: {
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
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id,name,coverage_area,metadata,accepting_clients,capacity_status,profile_status,profile_stage,status,lifecycle_status,public_profile_status"
    )
    .eq("status", "active")
    .in("lifecycle_status", ["managed", "seeded"])
    .in("public_profile_status", ["active", "pending_review", "draft"])
    .in("profile_status", ["active", "draft"])
    .in("profile_stage", ["created", "searchable", "enriched"]);

  if (error) throw new Error(error.message);

  const eligible = (data ?? []).filter((row) => isOrganizationMapListable(row));

  const dbRows = eligible.map((row) => {
    const cov = row.coverage_area as Record<string, unknown>;
    const states = statesFromCoverage(cov);
    const counties = countiesFromCoverage(cov);
    const pt = computeOrgMapPoint({
      id: row.id,
      coverage_area: cov,
      metadata: row.metadata,
    });
    return {
      id: row.id,
      name: row.name,
      lat: pt.lat,
      lng: pt.lng,
      approximate: pt.approximate,
      accepting_clients: Boolean(row.accepting_clients),
      capacity_status: row.capacity_status ?? "unknown",
      region_label: regionLabelForOrg(states, counties),
      states,
    };
  });

  const cboRows = loadCboVaMapRows();
  return [...dbRows, ...cboRows];
}
