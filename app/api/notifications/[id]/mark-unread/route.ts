/**
 * POST /api/notifications/[id]/mark-unread
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { markNotificationUnread } from "@/lib/server/notifications/notificationService";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: Request, ctxParams: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await ctxParams.params;

    const actor = buildActor(ctx);
    const decision = await can("notification:mark_unread", actor, {
      type: "notification", id, ownerId: ctx.userId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    await markNotificationUnread({ notificationId: id, ctx });
    return apiOk({ success: true });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") logger.error("notifications.mark-unread.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
