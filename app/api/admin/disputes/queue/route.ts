import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getDisputeQueue } from "@/lib/server/admin/adminService";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) return apiFail("FORBIDDEN", "Admin only.", undefined, 403);

    const url = new URL(req.url);
    const result = await getDisputeQueue(
      {
        userId: ctx.userId,
        accountType: ctx.accountType,
        isAdmin: true,
        organizationId: ctx.orgId ?? null,
      },
      {
        status: url.searchParams.get("status") ?? undefined,
        assignedTo: url.searchParams.get("assignedTo") ?? undefined,
        orgId: url.searchParams.get("orgId") ?? undefined,
        cursor: url.searchParams.get("cursor"),
        limit: Number.parseInt(url.searchParams.get("limit") ?? "25", 10),
      },
    );
    return apiOk(
      { disputes: result.disputes },
      { nextCursor: result.nextCursor },
    );
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("admin.disputes.queue.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
