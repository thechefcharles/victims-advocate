/**
 * Victim-facing: active organizations with map coordinates for the Find Organizations page.
 * Coordinates may be org-supplied (metadata) or approximate from coverage area.
 */

import { getAuthContext, requireAuth, requireRole } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import {
  countiesFromCoverage,
  regionLabelForOrg,
  statesFromCoverage,
} from "@/lib/server/ecosystem/regions";
import { computeOrgMapPoint } from "@/lib/server/organizations/mapCoordinates";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireRole(ctx, "victim");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("organizations")
      .select(
        "id,name,coverage_area,metadata,accepting_clients,capacity_status,profile_status,status"
      )
      .eq("status", "active")
      .eq("profile_status", "active");

    if (error) throw new Error(error.message);

    const organizations = (data ?? []).map((row) => {
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
      };
    });

    return apiOk({ organizations });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("victim.organizations-map.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
