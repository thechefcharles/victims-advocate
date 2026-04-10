/**
 * Revoke org membership (org_admin tier).
 * Domain 3.2: auth via can("org:revoke_member"). Logic delegated to revokeOrgMembership.
 */

import {
  getAuthContext,
  requireFullAccess,
  requireOrg,
} from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { revokeOrgMembership } from "@/lib/server/organizations/membershipService";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireOrg(ctx);

    const actor = buildActor(ctx);
    const decision = await can("org:revoke_member", actor, { type: "org", id: ctx.orgId!, ownerId: ctx.orgId! });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
    }

    const membershipId =
      typeof body.membership_id === "string" ? body.membership_id.trim() : "";

    if (!membershipId) {
      return apiFail("VALIDATION_ERROR", "membership_id is required", undefined, 422);
    }

    await revokeOrgMembership(membershipId, ctx, req);
    return apiOk({ revoked: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.members.revoke.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
