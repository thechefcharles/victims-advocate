/**
 * Phase 2: Revoke org invite (org_admin or admin).
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess, requireOrg, requireOrgRole } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    // Admin can revoke any invite; org_admin must be in the org
    const isAdmin = ctx.isAdmin;
    if (!isAdmin) {
      requireOrg(ctx);
      requireOrgRole(ctx, "org_admin");
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 422);
    }

    const inviteId = typeof body.invite_id === "string" ? body.invite_id.trim() : "";
    if (!inviteId) {
      return apiFail("VALIDATION_ERROR", "invite_id is required", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from("org_invites")
      .select("id, organization_id, email, org_role")
      .eq("id", inviteId)
      .is("used_at", null)
      .is("revoked_at", null)
      .maybeSingle();

    if (!existing) {
      return apiFail("NOT_FOUND", "Invite not found or already used/revoked", undefined, 404);
    }

    if (!isAdmin && existing.organization_id !== ctx.orgId) {
      return apiFail("FORBIDDEN", "Cannot revoke invite from another organization", undefined, 403);
    }

    const { error } = await supabase
      .from("org_invites")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: ctx.userId,
      })
      .eq("id", inviteId);

    if (error) throw new Error(error.message);

    await logEvent({
      ctx,
      action: "org.invite.revoke",
      resourceType: "org_invite",
      resourceId: inviteId,
      organizationId: existing.organization_id,
      metadata: { email: existing.email, org_role: existing.org_role },
      req,
    });

    return apiOk({ revoked: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.invites.revoke.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
