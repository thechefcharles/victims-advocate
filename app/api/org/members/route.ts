/**
 * List org members (org leadership or platform admin).
 * Domain 3.2: auth via can("org:view_members"). Logic delegated to listOrgMembers.
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
import { listOrgMembers } from "@/lib/server/organizations/membershipService";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const isAdmin = ctx.isAdmin;
    if (!isAdmin) {
      requireOrg(ctx);
    }

    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("organization_id")?.trim();
    const orgId = isAdmin && orgIdParam ? orgIdParam : ctx.orgId!;

    if (!orgId) {
      return apiFail("VALIDATION_ERROR", "organization_id required for admin", undefined, 422);
    }

    const actor = buildActor(ctx);
    const decision = await can("org:view_members", actor, { type: "org", id: orgId, ownerId: orgId });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const members = await listOrgMembers(orgId, ctx);
    return apiOk({ members });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.members.list.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
