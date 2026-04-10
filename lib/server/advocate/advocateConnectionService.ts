/**
 * Advocate connection request service.
 *
 * Extracted from the 340-line route handler. Handles the full flow:
 * validate → lookup advocate → check duplicates → create or reopen request → notify.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createNotification } from "@/lib/server/notifications/create";
import { getVictimDisplayForNotification } from "@/lib/server/notifications/applicantDisplay";
import { upsertAdvocateCaseAccess } from "@/lib/server/advocate/grantAdvocateCaseAccess";

export type ConnectionRequestInput = {
  advocateEmail: string;
  caseId: string;
};

export type ConnectionRequestResult = {
  request_id?: string;
  added_to_case?: boolean;
  message: string;
};

export async function createAdvocateConnectionRequest(
  ctx: AuthContext,
  input: ConnectionRequestInput,
  req: Request,
): Promise<ConnectionRequestResult> {
  const { advocateEmail, caseId } = input;

  if (!advocateEmail) throw new AppError("VALIDATION_ERROR", "advocate_email is required", undefined, 422);
  if (!caseId) throw new AppError("VALIDATION_ERROR", "case_id is required.", undefined, 422);

  const supabase = getSupabaseAdmin();

  // Lookup advocate by email
  const { data: usersPage, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw new AppError("INTERNAL", "Advocate lookup failed", undefined, 500);
  const match = usersPage?.users?.find((u) => (u.email ?? "").toLowerCase() === advocateEmail);
  if (!match?.id) throw new AppError("NOT_FOUND", "No advocate account found for that email.", undefined, 404);

  const advocateUserId = match.id;

  // Validate advocate role
  const { data: advocateProfile } = await supabase.from("profiles").select("role").eq("id", advocateUserId).maybeSingle();
  if (advocateProfile?.role !== "advocate") throw new AppError("VALIDATION_ERROR", "That account is not set up as an advocate.", undefined, 400);
  if (ctx.userId === advocateUserId) throw new AppError("VALIDATION_ERROR", "You cannot connect with yourself.", undefined, 400);

  // Validate case ownership
  const { data: caseRow, error: caseLookupErr } = await supabase.from("cases").select("id, owner_user_id").eq("id", caseId).maybeSingle();
  if (caseLookupErr) throw new AppError("INTERNAL", "Case lookup failed", undefined, 500);
  if (!caseRow) throw new AppError("NOT_FOUND", "Case not found", undefined, 404);
  if (caseRow.owner_user_id !== ctx.userId) throw new AppError("FORBIDDEN", "You can only add advocates to your own cases.", undefined, 403);

  // Check for existing pending request for this case
  const { data: pendingSameCase } = await supabase
    .from("advocate_connection_requests").select("id")
    .eq("applicant_user_id", ctx.userId).eq("advocate_user_id", advocateUserId).eq("case_id", caseId).eq("status", "pending");
  if (pendingSameCase && pendingSameCase.length > 0) throw new AppError("VALIDATION_ERROR", "A connection request is already pending for this case.", undefined, 400);

  // Check existing access
  const { data: existingAccess } = await supabase
    .from("case_access").select("user_id")
    .eq("case_id", caseId).eq("user_id", advocateUserId).eq("role", "advocate").maybeSingle();
  if (existingAccess) throw new AppError("VALIDATION_ERROR", "This advocate already has access to this case.", undefined, 400);

  // Check case-scoped request
  const { data: caseScoped } = await supabase
    .from("advocate_connection_requests").select("id, status")
    .eq("applicant_user_id", ctx.userId).eq("advocate_user_id", advocateUserId).eq("case_id", caseId).maybeSingle();

  if (caseScoped?.status === "accepted") {
    await upsertAdvocateCaseAccess({ caseId, advocateUserId });
    return { request_id: caseScoped.id, added_to_case: true, message: "This advocate is already connected for this case." };
  }

  if (caseScoped?.status === "declined") {
    await supabase.from("advocate_connection_requests").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", caseScoped.id);
    await notifyBothParties(ctx, req, advocateUserId, advocateEmail, caseScoped.id, caseId);
    logger.info("advocate_connection.request.reopened_case", { requestId: caseScoped.id, applicantId: ctx.userId, advocateId: advocateUserId, caseId });
    return { request_id: caseScoped.id, message: "Connection request sent. The advocate will be notified." };
  }

  // Check legacy global row
  const { data: globalRow } = await supabase
    .from("advocate_connection_requests").select("id, status")
    .eq("applicant_user_id", ctx.userId).eq("advocate_user_id", advocateUserId).is("case_id", null).maybeSingle();

  if (globalRow?.status === "accepted") {
    await upsertAdvocateCaseAccess({ caseId, advocateUserId });
    logger.info("advocate_connection.add_to_case_from_global", { applicantId: ctx.userId, advocateId: advocateUserId, caseId });
    return { added_to_case: true, message: "Your advocate has been added to this case." };
  }

  // Create new request
  const { data: row, error } = await supabase
    .from("advocate_connection_requests")
    .insert({ applicant_user_id: ctx.userId, advocate_user_id: advocateUserId, case_id: caseId, status: "pending", updated_at: new Date().toISOString() })
    .select("id").single();
  if (error || !row) throw new AppError("INTERNAL", "Failed to create connection request", undefined, 500);

  await notifyBothParties(ctx, req, advocateUserId, advocateEmail, row.id, caseId);
  logger.info("advocate_connection.request", { requestId: row.id, applicantId: ctx.userId, advocateId: advocateUserId, caseId });

  return { request_id: row.id, message: "Connection request sent. The advocate will be notified." };
}

// ---------------------------------------------------------------------------
// Notification helpers
// ---------------------------------------------------------------------------

function connectionRequestsBaseUrl(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    req.headers.get("origin") ||
    "https://victims-advocate.vercel.app"
  ).replace(/\/$/, "");
}

async function notifyBothParties(
  ctx: AuthContext, req: Request, advocateUserId: string,
  advocateEmail: string, requestId: string, caseId: string,
): Promise<void> {
  const { displayName, email } = await getVictimDisplayForNotification(ctx.userId);
  const base = connectionRequestsBaseUrl(req);

  await createNotification({
    userId: advocateUserId, type: "advocate_connection_request",
    title: "Connection request", body: `${displayName}${email ? ` · ${email}` : ""}\n\nWants to connect with you on a case.`,
    actionUrl: `${base}/advocate/connection-requests`, previewSafe: true, caseId,
    metadata: { request_id: requestId, applicant_user_id: ctx.userId, case_id: caseId },
  }, ctx);

  await createNotification({
    userId: ctx.userId, type: "applicant_connection_request_pending",
    title: "Connection request pending",
    body: `You asked to add ${advocateEmail} as an advocate on this case. They will be notified and can accept or decline.`,
    actionUrl: `${base}/dashboard`, previewSafe: true, caseId,
    metadata: { request_id: requestId, advocate_email: advocateEmail, case_id: caseId },
  }, ctx);
}
