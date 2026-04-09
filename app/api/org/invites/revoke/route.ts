/**
 * Revoke org invite (org_admin or platform admin).
 * Domain 3.2: auth via can("org:revoke_invite"). Logic delegated to revokeOrgInvite.
 */

import {
  getAuthContext,
  requireFullAccess,
  requireOrg,
} from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { revokeOrgInvite } from "@/lib/server/organizations/inviteService";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const isAdmin = ctx.isAdmin;
    if (!isAdmin) {
      requireOrg(ctx);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
    }

    const inviteId = typeof body.invite_id === "string" ? body.invite_id.trim() : "";
    if (!inviteId) {
      return apiFail("VALIDATION_ERROR", "invite_id is required", undefined, 422);
    }

    // For admin, allow targeting any org via body.organization_id; otherwise use ctx.orgId
    const orgId = (isAdmin && typeof body.organization_id === "string" && body.organization_id.trim())
      ? body.organization_id.trim()
      : ctx.orgId!;

    if (!orgId) {
      return apiFail("VALIDATION_ERROR", "organization_id required when not in an org", undefined, 422);
    }

    const actor = buildActor(ctx);
    const decision = await can("org:revoke_invite", actor, { type: "org", id: orgId, ownerId: orgId });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    await revokeOrgInvite(inviteId, { ...ctx, orgId });

    await logEvent({
      ctx,
      action: "org.invite.revoke",
      resourceType: "org_invite",
      resourceId: inviteId,
      organizationId: orgId,
      metadata: {},
      req,
    });

    return apiOk({ revoked: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.invites.revoke.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
