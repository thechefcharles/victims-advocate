/**
 * Admin: approve an ownership claim — add org_owner membership and mark claim approved.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { createNotification } from "@/lib/server/notifications/create";
import { syncOrganizationLifecycleFromOwnership } from "@/lib/server/organizations/state";

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

    const { data: otherOrgMem } = await supabase
      .from("org_memberships")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (otherOrgMem && otherOrgMem.organization_id !== organizationId) {
      return apiFail(
        "VALIDATION_ERROR",
        "This user already belongs to a different organization",
        undefined,
        409
      );
    }

    const { data: existingSameOrg } = await supabase
      .from("org_memberships")
      .select("id, org_role")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .maybeSingle();

    if (existingSameOrg) {
      const now = new Date().toISOString();
      await supabase
        .from("org_claim_requests")
        .update({
          status: "approved",
          reviewed_at: now,
          reviewer_id: ctx.userId,
        })
        .eq("id", claimId);
      return apiOk({ already_member: true, organization_id: organizationId });
    }

    const { error: memErr } = await supabase.from("org_memberships").insert({
      user_id: userId,
      organization_id: organizationId,
      org_role: "org_owner",
      status: "active",
      created_by: ctx.userId,
    });

    if (memErr) {
      throw new Error(memErr.message);
    }

    await syncOrganizationLifecycleFromOwnership(supabase, organizationId);

    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("org_claim_requests")
      .update({
        status: "approved",
        reviewed_at: now,
        reviewer_id: ctx.userId,
      })
      .eq("id", claimId);

    if (updErr) throw new Error(updErr.message);

    const base = appBaseUrl(req);
    await createNotification(
      {
        userId,
        organizationId,
        type: "org_claim_approved",
        title: "Organization ownership approved",
        body: `Your ownership request for "${organizationName}" was approved. Open your organization dashboard to continue.`,
        actionUrl: `${base}/organization/dashboard`,
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
      action: "admin.org_claim_request.approved",
      resourceType: "org_claim_request",
      resourceId: claimId,
      organizationId,
      metadata: { user_id: userId, organization_name: organizationName },
      req,
    });

    return apiOk({ organization_id: organizationId });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.org_claim_request.approve.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
