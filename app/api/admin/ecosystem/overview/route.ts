/**
 * Phase G: Restricted ecosystem overview (admin only).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { parseEcosystemFilters } from "@/lib/server/ecosystem/aggregate";
import { buildEcosystemOverview } from "@/lib/server/ecosystem/summary";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const url = new URL(req.url);
    const filters = parseEcosystemFilters(url.searchParams);
    const overview = await buildEcosystemOverview(filters);

    await logEvent({
      ctx,
      action: "ecosystem.viewed",
      resourceType: "ecosystem",
      metadata: {
        state: filters.state,
        county: filters.county ? true : false,
        time_window_days: filters.time_window_days,
        service_type: filters.service_type,
        language: filters.language,
      },
      req,
    }).catch(() => {});

    return apiOk(overview);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.ecosystem.overview.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
