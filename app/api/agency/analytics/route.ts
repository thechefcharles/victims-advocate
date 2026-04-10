/**
 * GET /api/agency/analytics?type=provider_overview
 *
 * Reads from analytics_snapshots — NEVER from cases/programs/cvc_applications.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getAgencyAnalytics } from "@/lib/server/agency/agencyAnalyticsService";
import { resolveAgencyScope } from "@/lib/server/agency/agencyScopeService";
import type { AnalyticsSnapshotType } from "@/lib/server/agency/agencyTypes";
import { ANALYTICS_SNAPSHOT_TYPES } from "@/lib/server/agency/agencyTypes";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("agency_analytics:view", actor, {
      type: "agency_analytics", id: null,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const scope = await resolveAgencyScope(actor);
    if (!scope) {
      return apiFail("FORBIDDEN", "No agency scope found.", undefined, 403);
    }

    const url = new URL(req.url);
    const typeParam = url.searchParams.get("type") ?? "provider_overview";
    if (!ANALYTICS_SNAPSHOT_TYPES.includes(typeParam as AnalyticsSnapshotType)) {
      return apiFail("VALIDATION_ERROR", `Invalid snapshot type: ${typeParam}`, undefined, 422);
    }

    const result = await getAgencyAnalytics({
      agencyId: scope.agencyId,
      snapshotType: typeParam as AnalyticsSnapshotType,
    });

    return apiOk({ analytics: result });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("agency.analytics.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
