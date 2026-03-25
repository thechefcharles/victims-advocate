/**
 * Shared payload for victim/advocate “find organizations” map APIs.
 */

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
};

export async function loadOrganizationsMapRows(): Promise<OrganizationMapRow[]> {
  const supabase = getSupabaseAdmin();
  // Phase 6: require lifecycle_status === "managed" and public_profile_status === "active" for public map rows.
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id,name,coverage_area,metadata,accepting_clients,capacity_status,profile_status,profile_stage,status"
    )
    .eq("status", "active")
    .eq("profile_status", "active")
    .in("profile_stage", ["searchable", "enriched"]);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
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
}
