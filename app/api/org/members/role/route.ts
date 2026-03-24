/**
 * Phase 2: Change member org_role (org owner or program manager).
 */

import {
  getAuthContext,
  requireFullAccess,
  requireOrg,
  requireOrgRole,
  ORG_MANAGEMENT_ROLES,
  ORG_MEMBERSHIP_ROLES,
  normalizeOrgRoleInput,
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
    requireOrgRole(ctx, ORG_MANAGEMENT_ROLES);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 422);
    }

    const membershipId =
      typeof body.membership_id === "string" ? body.membership_id.trim() : "";
    const rawNewRole =
      typeof body.org_role === "string" ? body.org_role.trim().toLowerCase() : "";
    const newRole = normalizeOrgRoleInput(rawNewRole);

    if (!membershipId) {
      return apiFail("VALIDATION_ERROR", "membership_id is required", undefined, 422);
    }
    if (!newRole || !(ORG_MEMBERSHIP_ROLES as readonly string[]).includes(newRole)) {
      return apiFail(
        "VALIDATION_ERROR",
        `org_role must be one of: ${ORG_MEMBERSHIP_ROLES.join(", ")}`,
        undefined,
        422
      );
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
      return apiFail("FORBIDDEN", "Cannot modify membership in another organization", undefined, 403);
    }
    if (existing.org_role === newRole) {
      return apiOk({ membership: existing, changed: false });
    }

    const { data: updated, error } = await supabase
      .from("org_memberships")
      .update({ org_role: newRole })
      .eq("id", membershipId)
      .select("id, org_role")
      .single();

    if (error) throw new Error(error.message);

    await logEvent({
      ctx,
      action: "role_changed",
      resourceType: "org_membership",
      resourceId: membershipId,
      organizationId: ctx.orgId!,
      targetUserId: existing.user_id,
      metadata: { from_role: existing.org_role, to_role: newRole },
      req,
    });

    return apiOk({ membership: updated, changed: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.members.role.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
