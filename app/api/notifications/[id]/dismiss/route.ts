import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFail, apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { dismissNotification } from "@/lib/server/notifications/query";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const notificationId = id?.trim();
    if (!notificationId) {
      return apiFail("VALIDATION_ERROR", "Missing notification id", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("id", notificationId)
      .eq("user_id", ctx.userId)
      .maybeSingle();

    if (!existing) {
      return apiFail("NOT_FOUND", "Notification not found", undefined, 404);
    }

    await dismissNotification({ notificationId, ctx });
    return apiOk({ ok: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("notifications.dismiss.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
