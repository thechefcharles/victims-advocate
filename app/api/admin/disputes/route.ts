/**
 * Domain 6.1 — Admin dispute listing.
 * GET /api/admin/disputes?status=under_review&cursor=...
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  listDisputesForAdmin,
  type DisputeActor,
} from "@/lib/server/trust/signalDisputeService";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) return apiFail("FORBIDDEN", "Admin only.", undefined, 403);

    const actor: DisputeActor = {
      userId: ctx.userId,
      accountType: ctx.accountType,
      organizationId: ctx.orgId ?? null,
      isAdmin: true,
    };

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const cursor = url.searchParams.get("cursor");
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "25", 10);

    const result = await listDisputesForAdmin(actor, { status, cursor, limit });
    return apiOk(
      { disputes: result.disputes },
      { nextCursor: result.nextCursor, limit },
    );
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("admin.disputes.get.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
