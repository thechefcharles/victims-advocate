/**
 * Victim requests to connect with an advocate by email.
 * Advocate receives a notification to accept/decline.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { requireRole } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createNotification } from "@/lib/server/notifications/create";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireRole(ctx, "victim");

    const body = await req.json().catch(() => ({}));
    const advocateEmail = String(body?.advocate_email ?? "").trim().toLowerCase();

    if (!advocateEmail) {
      return apiFail("VALIDATION_ERROR", "advocate_email is required", undefined, 422);
    }

    const supabase = getSupabaseAdmin();

    const { data: usersPage, error: listErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listErr) {
      throw new AppError("INTERNAL", "Advocate lookup failed", undefined, 500);
    }
    const match = usersPage?.users?.find((u) => (u.email ?? "").toLowerCase() === advocateEmail);

    if (!match?.id) {
      return apiFail(
        "NOT_FOUND",
        "No advocate account found for that email. Ask them to create an account first.",
        undefined,
        404
      );
    }

    const advocateUserId = match.id;

    const { data: advocateProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", advocateUserId)
      .maybeSingle();

    if (advocateProfile?.role !== "advocate") {
      return apiFail(
        "VALIDATION_ERROR",
        "That account is not set up as an advocate.",
        undefined,
        400
      );
    }

    if (ctx.userId === advocateUserId) {
      return apiFail("VALIDATION_ERROR", "You cannot connect with yourself.", undefined, 400);
    }

    const { data: existing, error: existingErr } = await supabase
      .from("advocate_connection_requests")
      .select("id, status")
      .eq("victim_user_id", ctx.userId)
      .eq("advocate_user_id", advocateUserId)
      .maybeSingle();

    if (existingErr) {
      throw new AppError("INTERNAL", "Failed to check existing request", undefined, 500);
    }

    if (existing) {
      if (existing.status === "accepted") {
        return apiFail("VALIDATION_ERROR", "You are already connected with this advocate.", undefined, 400);
      }
      if (existing.status === "pending") {
        return apiFail("VALIDATION_ERROR", "A connection request is already pending.", undefined, 400);
      }
    }

    const { data: row, error } = await supabase
      .from("advocate_connection_requests")
      .upsert(
        {
          victim_user_id: ctx.userId,
          advocate_user_id: advocateUserId,
          status: "pending",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "victim_user_id,advocate_user_id",
        }
      )
      .select("id")
      .single();

    if (error || !row) {
      throw new AppError("INTERNAL", "Failed to create connection request", undefined, 500);
    }

    const victimEmail = ctx.user.email ?? "A survivor";
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      req.headers.get("origin") ||
      "https://victims-advocate.vercel.app";
    const acceptUrl = `${baseUrl.replace(/\/$/, "")}/advocate/connection-requests`;

    await createNotification(
      {
        userId: advocateUserId,
        type: "advocate_connection_request",
        title: "Connection request",
        body: `${victimEmail} wants to connect with you as their advocate.`,
        actionUrl: acceptUrl,
        metadata: {
          request_id: row.id,
          victim_user_id: ctx.userId,
        },
      },
      ctx
    );

    logger.info("advocate_connection.request", {
      requestId: row.id,
      victimId: ctx.userId,
      advocateId: advocateUserId,
    });

    return apiOk({
      request_id: row.id,
      message: "Connection request sent. The advocate will be notified.",
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("advocate_connection.request.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
