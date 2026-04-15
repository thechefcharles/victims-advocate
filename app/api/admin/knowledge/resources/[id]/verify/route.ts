import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { verifyKnowledgeResource } from "@/lib/server/admin/adminService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) return apiFail("FORBIDDEN", "Admin only.", undefined, 403);
    const { id } = await context.params;
    const updated = await verifyKnowledgeResource(
      {
        userId: ctx.userId,
        accountType: ctx.accountType,
        isAdmin: true,
        organizationId: ctx.orgId ?? null,
      },
      id,
    );
    return apiOk({ resource: updated });
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("admin.knowledge.resources.verify.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
