import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { listNotificationsForUser } from "@/lib/server/notifications/query";
import { syncApplicantConnectionNotifications } from "@/lib/server/notifications/applicantPendingSync";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    if (ctx.role === "victim") {
      await syncApplicantConnectionNotifications(ctx);
    }

    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 20, 100) : 20;

    const notifications = await listNotificationsForUser({
      ctx,
      unreadOnly,
      limit,
    });

    return apiOk({ notifications });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("notifications.list.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}

