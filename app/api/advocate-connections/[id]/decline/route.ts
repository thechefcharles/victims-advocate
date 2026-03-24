/**
 * Advocate declines a connection request from a victim.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthContext, requireFullAccess, requireRole } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { toAppError, AppError } from "@/lib/server/api";
import { removeVictimPendingConnectionNotificationsForRequest } from "@/lib/server/notifications/removeVictimPendingForRequest";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireRole(ctx, "advocate");

    const { id } = await params;
    const requestId = id?.trim();
    if (!requestId) {
      return apiFail("VALIDATION_ERROR", "Request ID is required", undefined, 422);
    }

    const supabase = getSupabaseAdmin();

    const { data: row, error: fetchErr } = await supabase
      .from("advocate_connection_requests")
      .select("id, status, victim_user_id")
      .eq("id", requestId)
      .eq("advocate_user_id", ctx.userId)
      .maybeSingle();

    if (fetchErr || !row) {
      return apiFail("NOT_FOUND", "Request not found or already handled", undefined, 404);
    }

    if (row.status !== "pending") {
      return apiFail("VALIDATION_ERROR", "This request was already " + row.status, undefined, 400);
    }

    const { error: updateErr } = await supabase
      .from("advocate_connection_requests")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (updateErr) {
      throw new AppError("INTERNAL", "Failed to decline request", undefined, 500);
    }

    await removeVictimPendingConnectionNotificationsForRequest(
      row.victim_user_id as string,
      requestId
    );

    logger.info("advocate_connection.decline", { requestId, advocateId: ctx.userId });

    return apiOk({ message: "Connection request declined." });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("advocate_connection.decline.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
