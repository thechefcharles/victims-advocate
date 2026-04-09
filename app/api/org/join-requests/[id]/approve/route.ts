/**
 * Org leadership approves an advocate's join request (creates staff membership).
 * Domain 3.2: auth via can("org:approve_join"). Logic delegated to approveJoinRequest.
 * Optional JSON body `{ "org_role": "supervisor" | "victim_advocate" | "intake_specialist" }`.
 */

import {
  getAuthContext,
  requireAuth,
  requireFullAccess,
  requireOrg,
  ORG_SELF_SERVE_INVITE_ROLES,
  normalizeOrgRoleInput,
  type OrgRole,
} from "@/lib/server/auth";
import { dbOrgRoleProductLabel } from "@/lib/auth/simpleOrgRole";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { approveJoinRequest } from "@/lib/server/organizations/membershipService";
import { createNotification } from "@/lib/server/notifications/create";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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

    let assignedRole: OrgRole = "victim_advocate";
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      const raw =
        body && typeof body === "object" && typeof (body as { org_role?: unknown }).org_role === "string"
          ? String((body as { org_role: string }).org_role).trim().toLowerCase()
          : "";
      if (raw) {
        const parsed = normalizeOrgRoleInput(raw);
        if (!parsed || !(ORG_SELF_SERVE_INVITE_ROLES as readonly string[]).includes(parsed)) {
          return apiFail(
            "VALIDATION_ERROR",
            `org_role must be one of: ${ORG_SELF_SERVE_INVITE_ROLES.join(", ")}`,
            undefined,
            422
          );
        }
        assignedRole = parsed;
      }
    }

    const membership = await approveJoinRequest(rid, ctx, req);
    const roleLabel = dbOrgRoleProductLabel(assignedRole);

    const supabase = getSupabaseAdmin();
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", ctx.orgId!)
      .maybeSingle();
    const orgName = (org as { name?: string } | null)?.name ?? "your organization";

    const base = appBaseUrl(req);
    await createNotification(
      {
        userId: membership.user_id,
        organizationId: ctx.orgId!,
        type: "advocate_org_join_resolved",
        title: "Organization request approved",
        body: `You've been added to ${orgName} as ${roleLabel}. Open your dashboard to continue.`,
        actionUrl: `${base}/dashboard`,
        previewSafe: true,
        metadata: {
          request_id: rid,
          organization_id: ctx.orgId!,
          outcome: "approved",
          org_role: membership.org_role,
        },
      },
      ctx
    );

    return apiOk({ ok: true, org_role: membership.org_role, org_role_label: dbOrgRoleProductLabel(membership.org_role) });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.join_request.approve.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
