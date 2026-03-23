/**
 * Admin: decline a pending organization proposal.
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const { id: proposalId } = await params;
    const pid = proposalId?.trim();
    if (!pid) {
      return apiFail("VALIDATION_ERROR", "Missing proposal id", undefined, 422);
    }

    const supabase = getSupabaseAdmin();

    const { data: proposal, error: fetchErr } = await supabase
      .from("pending_organization_proposals")
      .select("id, created_by, name, status")
      .eq("id", pid)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!proposal) {
      return apiFail("NOT_FOUND", "Proposal not found", undefined, 404);
    }
    if (proposal.status !== "pending") {
      return apiFail("VALIDATION_ERROR", "Proposal is no longer pending", undefined, 409);
    }

    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("pending_organization_proposals")
      .update({
        status: "declined",
        resolved_at: now,
        resolved_by: ctx.userId,
        updated_at: now,
      })
      .eq("id", pid);

    if (updErr) throw new Error(updErr.message);

    const base = appBaseUrl(req);
    await createNotification(
      {
        userId: proposal.created_by,
        organizationId: null,
        type: "org_proposal_declined",
        title: "Organization proposal update",
        body: `Your organization proposal "${proposal.name}" was not approved. You can submit a new proposal or contact support if you have questions.`,
        actionUrl: `${base}/organization/setup`,
        previewSafe: true,
        metadata: {
          proposal_id: pid,
          organization_name: proposal.name,
        },
      },
      ctx
    );

    await logEvent({
      ctx,
      action: "admin.org_proposal.declined",
      resourceType: "pending_organization_proposal",
      resourceId: pid,
      metadata: { proposal_id: pid, created_by: proposal.created_by },
      req,
    });

    return apiOk({ ok: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.pending_org_proposal.decline.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
