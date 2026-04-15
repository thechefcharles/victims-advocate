import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { initiateScoreMethodologyChangeRequest } from "@/lib/server/admin/adminService";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) return apiFail("FORBIDDEN", "Admin only.", undefined, 403);

    const body = (await req.json().catch(() => null)) as {
      changes?: { weights?: Record<string, number>; description?: string };
      reason?: string;
    } | null;
    if (!body?.changes || typeof body.reason !== "string") {
      return apiFail("VALIDATION_ERROR", "changes and reason are required.");
    }

    const result = await initiateScoreMethodologyChangeRequest(
      {
        userId: ctx.userId,
        accountType: ctx.accountType,
        isAdmin: true,
        organizationId: ctx.orgId ?? null,
      },
      body.changes,
      body.reason,
    );
    return apiOk(result, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("admin.configs.scoring.change_request.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
