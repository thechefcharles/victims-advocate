/**
 * Victim requests to connect with an advocate by email.
 * Optional case_id: request is scoped to that case; on accept, advocate gets case_access.
 * If the victim is already globally connected (accepted, no case_id), adding the same advocate
 * to a case grants case_access immediately without a new request.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { requireRole } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createNotification } from "@/lib/server/notifications/create";
import { upsertAdvocateCaseAccess } from "@/lib/server/advocate/grantAdvocateCaseAccess";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireRole(ctx, "victim");

    const body = await req.json().catch(() => ({}));
    const advocateEmail = String(body?.advocate_email ?? "").trim().toLowerCase();
    const rawCaseId = body?.case_id != null ? String(body.case_id).trim() : "";

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

    const { data: anyPendingRows, error: pendingErr } = await supabase
      .from("advocate_connection_requests")
      .select("id")
      .eq("victim_user_id", ctx.userId)
      .eq("advocate_user_id", advocateUserId)
      .eq("status", "pending");

    if (pendingErr) {
      throw new AppError("INTERNAL", "Failed to check pending requests", undefined, 500);
    }
    if (anyPendingRows && anyPendingRows.length > 0) {
      return apiFail("VALIDATION_ERROR", "A connection request is already pending.", undefined, 400);
    }

    /** Global-only row (legacy): case_id is null */
    const { data: globalRow, error: globalErr } = await supabase
      .from("advocate_connection_requests")
      .select("id, status")
      .eq("victim_user_id", ctx.userId)
      .eq("advocate_user_id", advocateUserId)
      .is("case_id", null)
      .maybeSingle();

    if (globalErr) {
      throw new AppError("INTERNAL", "Failed to check existing request", undefined, 500);
    }

    const caseId = rawCaseId || null;

    if (caseId) {
      const { data: caseRow, error: caseLookupErr } = await supabase
        .from("cases")
        .select("id, owner_user_id")
        .eq("id", caseId)
        .maybeSingle();

      if (caseLookupErr) {
        throw new AppError("INTERNAL", "Case lookup failed", undefined, 500);
      }
      if (!caseRow) {
        return apiFail("NOT_FOUND", "Case not found", undefined, 404);
      }
      if (caseRow.owner_user_id !== ctx.userId) {
        return apiFail("FORBIDDEN", "You can only add advocates to your own cases.", undefined, 403);
      }

      const { data: existingAccess } = await supabase
        .from("case_access")
        .select("user_id")
        .eq("case_id", caseId)
        .eq("user_id", advocateUserId)
        .eq("role", "advocate")
        .maybeSingle();

      if (existingAccess) {
        return apiFail(
          "VALIDATION_ERROR",
          "This advocate already has access to this case.",
          undefined,
          400
        );
      }

      const { data: caseScoped, error: caseScopedErr } = await supabase
        .from("advocate_connection_requests")
        .select("id, status")
        .eq("victim_user_id", ctx.userId)
        .eq("advocate_user_id", advocateUserId)
        .eq("case_id", caseId)
        .maybeSingle();

      if (caseScopedErr) {
        throw new AppError("INTERNAL", "Failed to check case request", undefined, 500);
      }

      if (caseScoped?.status === "accepted") {
        await upsertAdvocateCaseAccess({ caseId, advocateUserId });
        return apiOk({
          request_id: caseScoped.id,
          added_to_case: true,
          message: "This advocate is already connected for this case.",
        });
      }

      if (caseScoped?.status === "declined") {
        const { error: reopenCaseErr } = await supabase
          .from("advocate_connection_requests")
          .update({
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", caseScoped.id);

        if (reopenCaseErr) {
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
            body: `${victimEmail} wants to connect with you on a case.`,
            actionUrl: acceptUrl,
            metadata: {
              request_id: caseScoped.id,
              victim_user_id: ctx.userId,
              case_id: caseId,
            },
          },
          ctx
        );

        logger.info("advocate_connection.request.reopened_case", {
          requestId: caseScoped.id,
          victimId: ctx.userId,
          advocateId: advocateUserId,
          caseId,
        });

        return apiOk({
          request_id: caseScoped.id,
          message: "Connection request sent. The advocate will be notified.",
        });
      }

      if (globalRow?.status === "accepted") {
        await upsertAdvocateCaseAccess({ caseId, advocateUserId });
        logger.info("advocate_connection.add_to_case_from_global", {
          victimId: ctx.userId,
          advocateId: advocateUserId,
          caseId,
        });
        return apiOk({
          added_to_case: true,
          message: "Your advocate has been added to this case.",
        });
      }

      const { data: row, error } = await supabase
        .from("advocate_connection_requests")
        .insert({
          victim_user_id: ctx.userId,
          advocate_user_id: advocateUserId,
          case_id: caseId,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
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
          body: `${victimEmail} wants to connect with you on a case.`,
          actionUrl: acceptUrl,
          metadata: {
            request_id: row.id,
            victim_user_id: ctx.userId,
            case_id: caseId,
          },
        },
        ctx
      );

      logger.info("advocate_connection.request", {
        requestId: row.id,
        victimId: ctx.userId,
        advocateId: advocateUserId,
        caseId,
      });

      return apiOk({
        request_id: row.id,
        message: "Connection request sent. The advocate will be notified.",
      });
    }

    // --- No case_id: legacy global request ---
    if (globalRow) {
      if (globalRow.status === "accepted") {
        return apiFail(
          "VALIDATION_ERROR",
          "You are already connected with this advocate. Open a case and add them to that application, or use Connect from your dashboard with a case selected.",
          undefined,
          400
        );
      }
      if (globalRow.status === "declined") {
        const { error: reopenErr } = await supabase
          .from("advocate_connection_requests")
          .update({
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", globalRow.id);

        if (reopenErr) {
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
              request_id: globalRow.id,
              victim_user_id: ctx.userId,
            },
          },
          ctx
        );

        logger.info("advocate_connection.request.reopened", {
          requestId: globalRow.id,
          victimId: ctx.userId,
          advocateId: advocateUserId,
        });

        return apiOk({
          request_id: globalRow.id,
          message: "Connection request sent. The advocate will be notified.",
        });
      }
    }

    const { data: row, error } = await supabase
      .from("advocate_connection_requests")
      .insert({
        victim_user_id: ctx.userId,
        advocate_user_id: advocateUserId,
        case_id: null,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
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
