import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getActiveConfigs } from "@/lib/server/admin/adminService";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) return apiFail("FORBIDDEN", "Admin only.", undefined, 403);
    const result = await getActiveConfigs({
      userId: ctx.userId,
      accountType: ctx.accountType,
      isAdmin: true,
      organizationId: ctx.orgId ?? null,
    });
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("admin.configs.get.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
