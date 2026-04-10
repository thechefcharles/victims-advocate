import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError, apiFail } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("safety_preference:quick_exit", actor, {
      type: "safety_preference",
      id: ctx.userId,
      ownerId: ctx.userId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

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
