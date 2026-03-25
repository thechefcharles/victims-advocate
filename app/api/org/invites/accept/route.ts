/**
 * Phase 2: Accept org invite (authenticated user, email must match).
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { sha256Hex } from "@/lib/server/audit/hash";
import { logger } from "@/lib/server/logging";
import { syncOrganizationLifecycleFromOwnership } from "@/lib/server/organizations/state";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 422);
    }

    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return apiFail("VALIDATION_ERROR", "token is required", undefined, 422);
    }

    const userEmail = (ctx.user.email ?? "").trim().toLowerCase();
    if (!userEmail) {
      return apiFail(
        "VALIDATION_ERROR",
        "User account has no email; cannot match invite",
        undefined,
        422
      );
    }

    const tokenHash = await sha256Hex(token);
    const supabase = getSupabaseAdmin();

    const { data: invite, error: inviteErr } = await supabase
      .from("org_invites")
      .select("id, organization_id, email, org_role")
      .eq("token_hash", tokenHash)
      .is("used_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (inviteErr) throw new Error(inviteErr.message);
    if (!invite) {
      return apiFail(
        "NOT_FOUND",
        "Invite not found, expired, already used, or revoked",
        undefined,
        404
      );
    }

    const inviteEmail = invite.email.trim().toLowerCase();
    if (inviteEmail !== userEmail) {
      return apiFail(
        "FORBIDDEN",
        "Invite email does not match your account email",
        undefined,
        403
      );
    }

    // v1: reject if user already in an org
    const { data: existingMembership } = await supabase
      .from("org_memberships")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("status", "active")
      .maybeSingle();

    if (existingMembership) {
      return apiFail(
        "VALIDATION_ERROR",
        "You already belong to an organization",
        undefined,
        422
      );
    }

    const { data: membership, error: membershipErr } = await supabase
      .from("org_memberships")
      .insert({
        user_id: ctx.userId,
        organization_id: invite.organization_id,
        org_role: invite.org_role,
        created_by: ctx.userId,
      })
      .select("id, organization_id, org_role")
      .single();

    if (membershipErr) throw new Error(membershipErr.message);

    if (invite.org_role === "org_owner") {
      await syncOrganizationLifecycleFromOwnership(supabase, invite.organization_id);
    }

    const { error: updateErr } = await supabase
      .from("org_invites")
      .update({
        used_at: new Date().toISOString(),
        used_by: ctx.userId,
      })
      .eq("id", invite.id);

    if (updateErr) throw new Error(updateErr.message);

    await logEvent({
      ctx,
      action: "role_assigned",
      resourceType: "org_invite",
      resourceId: invite.id,
      organizationId: invite.organization_id,
      targetUserId: ctx.userId,
      metadata: { email: invite.email, org_role: invite.org_role, via: "invite_accept" },
      req,
    });

    return apiOk({
      orgId: membership.organization_id,
      orgRole: membership.org_role,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.invites.accept.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
