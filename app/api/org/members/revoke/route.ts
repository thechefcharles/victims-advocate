/**
 * Phase 2: Revoke org membership (org_admin).
 */

import { NextResponse } from "next/server";
import {
  getAuthContext,
  requireFullAccess,
  requireOrg,
  requireOrgRole,
  SIMPLE_ORG_MANAGEMENT_ROLES,
} from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireOrg(ctx);
    requireOrgRole(ctx, SIMPLE_ORG_MANAGEMENT_ROLES);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
    }

    const membershipId =
      typeof body.membership_id === "string" ? body.membership_id.trim() : "";

    if (!membershipId) {
      return apiFail("VALIDATION_ERROR", "membership_id is required", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from("org_memberships")
      .select("id, organization_id, user_id, org_role")
      .eq("id", membershipId)
      .eq("status", "active")
      .maybeSingle();

    if (!existing) {
      return apiFail("NOT_FOUND", "Membership not found", undefined, 404);
    }
    if (existing.organization_id !== ctx.orgId) {
      return apiFail("FORBIDDEN", "Cannot revoke membership in another organization", undefined, 403);
    }
    if (existing.user_id === ctx.userId) {
      return apiFail(
        "VALIDATION_ERROR",
        "Cannot revoke your own membership",
        undefined,
        422
      );
    }

    const { error } = await supabase
      .from("org_memberships")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by: ctx.userId,
      })
      .eq("id", membershipId);

    if (error) throw new Error(error.message);

    await logEvent({
      ctx,
      action: "member_removed",
      resourceType: "org_membership",
      resourceId: membershipId,
      organizationId: ctx.orgId!,
      targetUserId: existing.user_id,
      metadata: { org_role: existing.org_role },
      req,
    });

    return apiOk({ revoked: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.members.revoke.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
