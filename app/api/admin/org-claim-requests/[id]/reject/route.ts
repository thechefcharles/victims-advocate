/**
 * Admin: reject an ownership claim without creating membership.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { createNotification } from "@/lib/server/notifications/create";

function appBaseUrl(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    req.headers.get("origin") ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const { id: rawId } = await params;
    const claimId = rawId?.trim();
    if (!claimId) {
      return apiFail("VALIDATION_ERROR", "Missing claim id", undefined, 422);
    }

    const body = await req.json().catch(() => ({}));
    const reviewerNote =
      typeof (body as { reviewer_note?: unknown })?.reviewer_note === "string"
        ? String((body as { reviewer_note: string }).reviewer_note).trim().slice(0, 2000) || null
        : null;

    const supabase = getSupabaseAdmin();

    const { data: claim, error: fetchErr } = await supabase
      .from("org_claim_requests")
      .select("id, user_id, organization_id, status, organizations(name)")
      .eq("id", claimId)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!claim) {
      return apiFail("NOT_FOUND", "Claim not found", undefined, 404);
    }
    if (claim.status !== "pending") {
      return apiFail("VALIDATION_ERROR", "This claim is no longer pending", undefined, 409);
    }

    const org = claim.organizations as { name?: string } | null | undefined;
    const organizationName = org?.name ?? "Organization";
    const organizationId = claim.organization_id as string;
    const userId = claim.user_id as string;

    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("org_claim_requests")
      .update({
        status: "rejected",
        reviewed_at: now,
        reviewer_id: ctx.userId,
        reviewer_note: reviewerNote,
      })
      .eq("id", claimId);

    if (updErr) throw new Error(updErr.message);

    const base = appBaseUrl(req);
    await createNotification(
      {
        userId,
        organizationId,
        type: "org_claim_rejected",
        title: "Organization ownership request not approved",
        body: `Your ownership request for "${organizationName}" was not approved. You can submit a new request from organization setup if your situation changes.`,
        actionUrl: `${base}/organization/setup`,
        previewSafe: true,
        metadata: {
          claim_id: claimId,
          organization_id: organizationId,
          organization_name: organizationName,
        },
      },
      ctx
    );

    await logEvent({
      ctx,
      action: "admin.org_claim_request.rejected",
      resourceType: "org_claim_request",
      resourceId: claimId,
      organizationId,
      metadata: { user_id: userId, organization_name: organizationName },
      req,
    });

    return apiOk({ ok: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.org_claim_request.reject.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
