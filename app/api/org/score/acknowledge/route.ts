/**
 * Domain 6.1 — Provider acknowledges their score early.
 *
 * POST /api/org/score/acknowledge
 *   Auth: authenticated provider with an orgId. Flips the caller's own org
 *   trust_signal_summary row to public_display_active = true. Admin may
 *   acknowledge on behalf of an org via ?organization_id=....
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { acknowledgePublicDisplay } from "@/lib/server/trust/reviewWindowService";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const url = new URL(req.url);
    const overrideOrg = url.searchParams.get("organization_id");
    const orgId = ctx.isAdmin && overrideOrg ? overrideOrg : ctx.orgId;

    if (!orgId) {
      return apiFail("FORBIDDEN", "No organization context.", undefined, 403);
    }
    if (!ctx.isAdmin && ctx.accountType !== "provider") {
      return apiFail(
        "FORBIDDEN",
        "Only provider organizations may acknowledge their score.",
        undefined,
        403,
      );
    }

    const result = await acknowledgePublicDisplay(orgId);
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("org.score.acknowledge.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
