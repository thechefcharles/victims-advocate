import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getEscalationEvents } from "@/lib/server/admin/adminService";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) return apiFail("FORBIDDEN", "Admin only.", undefined, 403);

    const url = new URL(req.url);
    const category = url.searchParams.get("category") as
      | "safety_crisis"
      | "scope_boundary"
      | "accumulative_distress"
      | null;
    const result = await getEscalationEvents(
      {
        userId: ctx.userId,
        accountType: ctx.accountType,
        isAdmin: true,
        organizationId: ctx.orgId ?? null,
      },
      {
        category: category ?? undefined,
        sessionId: url.searchParams.get("sessionId") ?? undefined,
        orgId: url.searchParams.get("orgId") ?? undefined,
        dateRangeStart: url.searchParams.get("from") ?? undefined,
        dateRangeEnd: url.searchParams.get("to") ?? undefined,
        cursor: url.searchParams.get("cursor"),
        limit: Number.parseInt(url.searchParams.get("limit") ?? "50", 10),
      },
    );
    return apiOk(
      { events: result.events },
      { nextCursor: result.nextCursor },
    );
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("admin.ai.escalations.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
