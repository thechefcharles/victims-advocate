/**
 * Accept org invite (authenticated user, email must match).
 * Domain 3.2: all invite validation delegated to acceptOrgInvite service.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";
import { acceptOrgInvite } from "@/lib/server/organizations/inviteService";
import { dbOrgRoleProductLabel } from "@/lib/auth/simpleOrgRole";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
    }

    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return apiFail("VALIDATION_ERROR", "token is required", undefined, 422);
    }

    const membership = await acceptOrgInvite(token, ctx);

    await logEvent({
      ctx,
      action: "role_assigned",
      resourceType: "org_invite",
      resourceId: membership.id,
      organizationId: membership.organization_id,
      targetUserId: ctx.userId,
      metadata: { org_role: membership.org_role, via: "invite_accept" },
      req,
    });

    return apiOk({
      orgId: membership.organization_id,
      orgRole: membership.org_role,
      orgRoleLabel: dbOrgRoleProductLabel(membership.org_role),
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.invites.accept.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
