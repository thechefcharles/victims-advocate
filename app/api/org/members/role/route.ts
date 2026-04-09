/**
 * Change member org_role (management tier).
 * Domain 3.2: auth via can("org:update_member_role"). Logic delegated to updateMemberRole.
 */

import {
  getAuthContext,
  requireFullAccess,
  requireOrg,
  normalizeOrgRoleInput,
  ORG_MEMBERSHIP_ROLES,
  ORG_OWNER_TIER_DB_ROLES,
} from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { updateMemberRole } from "@/lib/server/organizations/membershipService";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireOrg(ctx);

    const actor = buildActor(ctx);
    const decision = await can("org:update_member_role", actor, { type: "org", id: ctx.orgId!, ownerId: ctx.orgId! });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
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
    if (!ctx.isAdmin && (ORG_OWNER_TIER_DB_ROLES as readonly string[]).includes(newRole)) {
      return apiFail(
        "FORBIDDEN",
        "Owner-tier roles cannot be assigned through membership edit; use organization claim or platform admin.",
        undefined,
        403
      );
    }

    const membership = await updateMemberRole({ memberId: membershipId, newRole }, ctx, req);
    return apiOk({ membership, changed: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.members.role.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
