/**
 * Phase G: Internal org segment list for ecosystem analysis.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { parseEcosystemFilters } from "@/lib/server/ecosystem/aggregate";
import { buildEcosystemOrgList } from "@/lib/server/ecosystem/summary";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const url = new URL(req.url);
    const filters = parseEcosystemFilters(url.searchParams);
    const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") || "200", 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));

    const all = await buildEcosystemOrgList(filters);
    const slice = all.slice(offset, offset + limit);

    return apiOk({
      filters,
      total: all.length,
      limit,
      offset,
      organizations: slice,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.ecosystem.organizations.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
