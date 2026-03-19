/**
 * Advocate accepts a connection request from a victim.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthContext, requireFullAccess, requireRole } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { toAppError, AppError } from "@/lib/server/api";
import { createNotification } from "@/lib/server/notifications/create";

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
      .select("id, victim_user_id, advocate_user_id, status")
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
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (updateErr) {
      throw new AppError("INTERNAL", "Failed to accept request", undefined, 500);
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      req.headers.get("origin") ||
      "https://victims-advocate.vercel.app";

    await createNotification(
      {
        userId: row.victim_user_id,
        type: "advocate_connection_accepted",
        title: "Connection accepted",
        body: "Your advocate has accepted your connection request. You can now invite them to your cases.",
        actionUrl: `${baseUrl.replace(/\/$/, "")}/compensation`,
        metadata: { request_id: requestId },
      },
      ctx
    );

    logger.info("advocate_connection.accept", {
      requestId,
      advocateId: ctx.userId,
      victimId: row.victim_user_id,
    });

    return apiOk({ message: "Connection accepted. The victim has been notified." });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("advocate_connection.accept.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
