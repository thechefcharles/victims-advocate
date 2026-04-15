import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getEscalationSummary } from "@/lib/server/admin/adminService";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) return apiFail("FORBIDDEN", "Admin only.", undefined, 403);

    const url = new URL(req.url);
    const from =
      url.searchParams.get("from") ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = url.searchParams.get("to") ?? new Date().toISOString();

    const result = await getEscalationSummary(
      {
        userId: ctx.userId,
        accountType: ctx.accountType,
        isAdmin: true,
        organizationId: ctx.orgId ?? null,
      },
      from,
      to,
    );
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("admin.ai.escalations.summary.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
