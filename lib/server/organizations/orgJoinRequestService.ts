/**
 * Organization join request service.
 *
 * Extracted from the 222-line org/request-to-join route. Handles:
 * validate → check duplicates → insert request → notify org approvers → audit.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { createNotification } from "@/lib/server/notifications/create";
import { getAdvocateDisplayForNotification } from "@/lib/server/notifications/advocateDisplay";
import { logEvent } from "@/lib/server/audit/logEvent";
import { ORG_LEADERSHIP_ROLES } from "@/lib/server/auth/orgRoles";

export type OrgJoinRequestResult = {
  requestId: string;
  organizationId: string;
  organizationName: string;
};

export async function createOrgJoinRequest(
  ctx: AuthContext,
  organizationId: string,
  req: Request,
): Promise<OrgJoinRequestResult> {
  if (!organizationId) throw new AppError("VALIDATION_ERROR", "organization_id is required", undefined, 422);

  const supabase = getSupabaseAdmin();

  // Check existing membership
  const { data: existingMem } = await supabase
    .from("org_memberships").select("id").eq("user_id", ctx.userId).eq("status", "active").maybeSingle();
  if (existingMem) throw new AppError("VALIDATION_ERROR", "You already belong to an organization", undefined, 409);

  // Check pending request
  const { data: pending } = await supabase
    .from("org_rep_join_requests").select("id, organization_id")
    .eq("user_id", ctx.userId).eq("status", "pending").maybeSingle();
  if (pending) throw new AppError("VALIDATION_ERROR", "You already have a pending organization request.", { request_id: pending.id, organization_id: pending.organization_id }, 409);

  // Validate org exists and is active
  const { data: org, error: orgErr } = await supabase
    .from("organizations").select("id,name,status").eq("id", organizationId).maybeSingle();
  if (orgErr) throw new AppError("INTERNAL", orgErr.message);
  if (!org || org.status !== "active") throw new AppError("NOT_FOUND", "Organization not found", undefined, 404);

  // Insert request
  const { data: inserted, error: insErr } = await supabase
    .from("org_rep_join_requests").insert({ user_id: ctx.userId, organization_id: organizationId, status: "pending" })
    .select("id").single();
  if (insErr) {
    if (insErr.code === "23505") throw new AppError("VALIDATION_ERROR", "A pending request already exists", undefined, 409);
    throw new AppError("INTERNAL", insErr.message);
  }

  const requestId = inserted!.id as string;
  const orgName = String(org.name ?? "Organization");

  // Notify org approvers + platform admins
  const { displayName, email } = await getAdvocateDisplayForNotification(ctx.userId);
  await notifyOrgApprovers({ ctx, req, organizationId, organizationName: orgName, requestId, userId: ctx.userId, displayName, email });

  // Audit
  await logEvent({ ctx, action: "org.rep_join_request.created", resourceType: "org_rep_join_request", resourceId: requestId, organizationId, metadata: { organization_name: orgName }, req });

  return { requestId, organizationId, organizationName: orgName };
}

// ---------------------------------------------------------------------------
// Notification helper
// ---------------------------------------------------------------------------

function appBaseUrl(req: Request): string {
  return (process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) || req.headers.get("origin") || "http://localhost:3000").replace(/\/$/, "");
}

async function notifyOrgApprovers(params: {
  ctx: AuthContext; req: Request; organizationId: string; organizationName: string;
  requestId: string; userId: string; displayName: string; email: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: members } = await supabase
    .from("org_memberships").select("user_id")
    .eq("organization_id", params.organizationId).eq("status", "active").in("org_role", [...ORG_LEADERSHIP_ROLES]);

  const { data: admins } = await supabase.from("profiles").select("id").eq("is_admin", true);
  const adminIds = (admins ?? []).map((r) => r.id as string);

  const base = appBaseUrl(params.req);
  const identity = `${params.displayName}${params.email ? ` · ${params.email}` : ""}`;
  const body = `${identity}\n\nRequested to join ${params.organizationName} as an organization representative.`;

  const recipients = [...new Set([...(members ?? []).map((m) => m.user_id), ...adminIds])];
  await Promise.all(recipients.map((uid) =>
    createNotification({ userId: uid, organizationId: params.organizationId, type: "org_rep_join_request", title: "Organization representative join request", body, actionUrl: `${base}/notifications`, previewSafe: true, metadata: { request_id: params.requestId, user_id: params.userId, organization_id: params.organizationId } }, params.ctx),
  ));
}
