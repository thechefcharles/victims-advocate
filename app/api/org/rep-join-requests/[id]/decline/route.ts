/**
 * Org admin / supervisor declines an org rep's join request.
 */

import {
  getAuthContext,
  requireAuth,
  requireFullAccess,
  requireOrg,
  requireOrgRole,
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
    requireOrgRole(ctx, ["org_admin", "supervisor"]);

    const { id: requestId } = await params;
    const rid = requestId?.trim();
    if (!rid) {
      return apiFail("VALIDATION_ERROR", "Missing request id", undefined, 422);
    }

    const supabase = getSupabaseAdmin();

    const { data: row, error: fetchErr } = await supabase
      .from("org_rep_join_requests")
      .select("id, user_id, organization_id, status")
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
      .from("org_rep_join_requests")
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
        userId: row.user_id,
        organizationId: row.organization_id,
        type: "org_rep_join_resolved",
        title: "Organization request update",
        body: `${orgName} did not approve your membership request. You can try again from organization setup.`,
        actionUrl: `${base}/organization/setup`,
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
      action: "org.rep_join_request.declined",
      resourceType: "org_rep_join_request",
      resourceId: rid,
      organizationId: row.organization_id,
      metadata: { user_id: row.user_id },
      req,
    });

    return apiOk({ ok: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.rep_join_request.decline.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
