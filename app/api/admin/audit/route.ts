import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getAuditEventsAdmin } from "@/lib/server/admin/adminService";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) return apiFail("FORBIDDEN", "Admin only.", undefined, 403);

    const url = new URL(req.url);
    const result = await getAuditEventsAdmin(
      {
        userId: ctx.userId,
        accountType: ctx.accountType,
        isAdmin: true,
        organizationId: ctx.orgId ?? null,
      },
      {
        resourceType: url.searchParams.get("resourceType") ?? undefined,
        resourceId: url.searchParams.get("resourceId") ?? undefined,
        eventCategory: url.searchParams.get("eventCategory") ?? undefined,
        actorId: url.searchParams.get("actorId") ?? undefined,
        limit: Number.parseInt(url.searchParams.get("limit") ?? "100", 10),
      },
    );
    return apiOk({ events: result });
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("admin.audit.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
