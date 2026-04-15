/**
 * Agency ecosystem analytics. Returns the latest ecosystem snapshot —
 * NEVER individual org rows. The snapshot itself enforces the k-anonymity
 * gate (MIN_ORG_COUNT) so this route is a thin pass-through.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getLatestEcosystemSnapshot } from "@/lib/server/analytics/aggregationWorker";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (ctx.accountType !== "agency" && !ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Agency access required.", undefined, 403);
    }
    const snapshot = await getLatestEcosystemSnapshot();
    if (!snapshot) {
      return apiOk({ snapshot: null, message: "No ecosystem snapshot available yet." });
    }
    return apiOk({ snapshot });
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("agency.analytics.overview.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
