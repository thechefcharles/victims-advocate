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
    const cursor = url.searchParams.get("cursor");

    // Cursor-based pagination: cursor is the id of the last row returned in the
    // previous page. The list is already sorted deterministically by
    // buildEcosystemOrgList, so we slice after the cursor row's position.
    const all = await buildEcosystemOrgList(filters);
    const startIdx = cursor ? all.findIndex((o) => o.organization_id === cursor) + 1 : 0;
    const window = all.slice(startIdx, startIdx + limit + 1);
    const hasMore = window.length > limit;
    const page = hasMore ? window.slice(0, limit) : window;
    const nextCursor = hasMore ? page[page.length - 1]?.organization_id ?? null : null;

    return apiOk(
      {
        filters,
        total: all.length,
        organizations: page,
      },
      { nextCursor, limit },
    );
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.ecosystem.organizations.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
