import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    await logEvent({
      ctx,
      action: "safety_mode.quick_exit",
      resourceType: "user",
      resourceId: ctx.userId,
      req,
    });

    return apiOk({ redirectTo: "/" });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("safety.quick_exit.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

