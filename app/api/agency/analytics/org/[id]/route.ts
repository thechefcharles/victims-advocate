/**
 * Agency per-org analytics. Serves trust_signal_summary for a specific org.
 * Never reaches into trust_signal_events — the summary row is the canonical
 * read-side projection for Phase 6 display.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getTrustSignalSummary } from "@/lib/server/analytics/aggregationWorker";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (ctx.accountType !== "agency" && !ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Agency access required.", undefined, 403);
    }
    const { id } = await context.params;
    const summary = await getTrustSignalSummary(id);
    if (!summary) {
      // Per spec: no row → data_pending status.
      return apiOk({
        organizationId: id,
        quality_tier: "data_pending",
        summary: null,
      });
    }
    return apiOk({ organizationId: id, summary });
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("agency.analytics.org.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
