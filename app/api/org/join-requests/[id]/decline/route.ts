/**
 * Org admin / supervisor declines an advocate’s join request.
 */

import {
  getAuthContext,
  requireAuth,
  requireFullAccess,
  requireOrg,
  requireOrgRole,
  SIMPLE_ORG_LEADERSHIP_ROLES,
} from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import { createNotification } from "@/lib/server/notifications/create";
import { logEvent } from "@/lib/server/audit/logEvent";

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
    requireOrgRole(ctx, SIMPLE_ORG_LEADERSHIP_ROLES);

    const { id: requestId } = await params;
    const rid = requestId?.trim();
    if (!rid) {
      return apiFail("VALIDATION_ERROR", "Missing request id", undefined, 422);
    }

    const supabase = getSupabaseAdmin();

    const { data: row, error: fetchErr } = await supabase
      .from("advocate_org_join_requests")
      .select("id, advocate_user_id, organization_id, status")
      .eq("id", rid)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!row) {
      return apiFail("NOT_FOUND", "Request not found", undefined, 404);
    }
    if (row.status !== "pending") {
      return apiFail("VALIDATION_ERROR", "This request is no longer pending", undefined, 409);
    }
    if (row.organization_id !== ctx.orgId) {
      return apiFail("FORBIDDEN", "This request belongs to another organization", undefined, 403);
    }

    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("advocate_org_join_requests")
      .update({
        status: "declined",
        resolved_at: now,
        resolved_by: ctx.userId,
        updated_at: now,
      })
      .eq("id", rid);

    if (updErr) throw new Error(updErr.message);

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

    await logEvent({
      ctx,
      action: "org.join_request.declined",
      resourceType: "advocate_org_join_request",
      resourceId: rid,
      organizationId: row.organization_id,
      metadata: { advocate_user_id: row.advocate_user_id },
      req,
    });

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
