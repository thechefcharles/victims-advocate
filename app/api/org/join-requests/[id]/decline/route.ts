/**
 * Org leadership declines an advocate's join request.
 * Domain 3.2: auth via can("org:approve_join"). Logic delegated to declineJoinRequest.
 */

import {
  getAuthContext,
  requireAuth,
  requireFullAccess,
  requireOrg,
} from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { declineJoinRequest } from "@/lib/server/organizations/membershipService";
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
    requireAuth(ctx);
    requireFullAccess(ctx, req);
    requireOrg(ctx);

    const actor = buildActor(ctx);
    const decision = await can("org:approve_join", actor, { type: "org", id: ctx.orgId!, ownerId: ctx.orgId! });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const { id: requestId } = await params;
    const rid = requestId?.trim();
    if (!rid) {
      return apiFail("VALIDATION_ERROR", "Missing request id", undefined, 422);
    }

    // Fetch request details before declining (for notification)
    const supabase = getSupabaseAdmin();
    const { data: row } = await supabase
      .from("advocate_org_join_requests")
      .select("advocate_user_id, organization_id")
      .eq("id", rid)
      .eq("organization_id", ctx.orgId!)
      .maybeSingle();

    await declineJoinRequest(rid, ctx, req);

    if (row) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", row.organization_id)
        .maybeSingle();
      const orgName = (org as { name?: string } | null)?.name ?? "the organization";

      const base = appBaseUrl(req);
      await createNotification(
        {
          userId: row.advocate_user_id,
          organizationId: row.organization_id,
          type: "advocate_org_join_resolved",
          title: "Organization request update",
          body: `${orgName} did not approve your membership request. You can try another organization from Find organizations.`,
          actionUrl: `${base}/advocate/find-organizations`,
          previewSafe: true,
          metadata: {
            request_id: rid,
            organization_id: row.organization_id,
            outcome: "declined",
          },
        },
        ctx
      );
    }

    return apiOk({ ok: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.join_request.decline.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
