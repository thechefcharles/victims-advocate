import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { initiateStateConfigChangeRequest } from "@/lib/server/admin/adminService";

interface RouteParams {
  params: Promise<{ stateCode: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) return apiFail("FORBIDDEN", "Admin only.", undefined, 403);

    const { stateCode } = await context.params;
    const body = (await req.json().catch(() => null)) as {
      changes?: Record<string, unknown>;
      reason?: string;
    } | null;
    if (!body?.changes || typeof body.reason !== "string") {
      return apiFail("VALIDATION_ERROR", "changes and reason are required.");
    }
    const result = await initiateStateConfigChangeRequest(
      {
        userId: ctx.userId,
        accountType: ctx.accountType,
        isAdmin: true,
        organizationId: ctx.orgId ?? null,
      },
      stateCode,
      body.changes,
      body.reason,
    );
    return apiOk(result, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("admin.configs.state.change_request.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
