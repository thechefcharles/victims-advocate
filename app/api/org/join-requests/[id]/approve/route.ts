/**
 * Org leadership approves an advocate’s join request (creates staff membership).
 * Phase 4: optional JSON `{ "org_role": "supervisor" | "victim_advocate" | "intake_specialist" }`
 * (same set as self-serve invites). Defaults to `victim_advocate`. Owner-tier roles are never
 * assignable here.
 */

import {
  getAuthContext,
  requireAuth,
  requireFullAccess,
  requireOrg,
  requireOrgRole,
  SIMPLE_ORG_LEADERSHIP_ROLES,
  ORG_SELF_SERVE_INVITE_ROLES,
  normalizeOrgRoleInput,
  type OrgRole,
} from "@/lib/server/auth";
import { dbOrgRoleProductLabel } from "@/lib/auth/simpleOrgRole";
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

    const { data: existingMem } = await supabase
      .from("org_memberships")
      .select("id")
      .eq("user_id", row.advocate_user_id)
      .eq("status", "active")
      .maybeSingle();

    if (existingMem) {
      await supabase
        .from("advocate_org_join_requests")
        .update({
          status: "cancelled",
          resolved_at: new Date().toISOString(),
          resolved_by: ctx.userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rid);
      return apiFail(
        "VALIDATION_ERROR",
        "This advocate already belongs to an organization",
        undefined,
        409
      );
    }

    const { error: memErr } = await supabase.from("org_memberships").insert({
      user_id: row.advocate_user_id,
      organization_id: row.organization_id,
      org_role: assignedRole,
      status: "active",
      created_by: ctx.userId,
    });

    if (memErr) {
      if (memErr.code === "23505") {
        return apiFail("VALIDATION_ERROR", "This advocate already has a membership", undefined, 409);
      }
      throw new Error(memErr.message);
    }

    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("advocate_org_join_requests")
      .update({
        status: "approved",
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
    const orgName = (org as { name?: string } | null)?.name ?? "your organization";
    const roleLabel = dbOrgRoleProductLabel(assignedRole);

    const base = appBaseUrl(req);
    await createNotification(
      {
        userId: row.advocate_user_id,
        organizationId: row.organization_id,
        type: "advocate_org_join_resolved",
        title: "Organization request approved",
        body: `You’ve been added to ${orgName} as ${roleLabel}. Open your dashboard to continue.`,
        actionUrl: `${base}/dashboard`,
        previewSafe: true,
        metadata: {
          request_id: rid,
          organization_id: row.organization_id,
          outcome: "approved",
          org_role: assignedRole,
        },
      },
      ctx
    );

    await logEvent({
      ctx,
      action: "org.join_request.approved",
      resourceType: "advocate_org_join_request",
      resourceId: rid,
      organizationId: row.organization_id,
      metadata: { advocate_user_id: row.advocate_user_id, org_role: assignedRole },
      req,
    });

    return apiOk({ ok: true, org_role: assignedRole, org_role_label: roleLabel });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.join_request.approve.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
