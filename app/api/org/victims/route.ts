/**
 * Victims (case owners) across all cases tied to the organization.
 * Org admin, supervisor, or platform admin.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { listApplicantsForOrganization } from "@/lib/server/organizations/listApplicantsForOrganization";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("organization_id")?.trim();
    const orgId = ctx.isAdmin && orgIdParam ? orgIdParam : ctx.orgId;

    if (!orgId) {
      return apiFail("VALIDATION_ERROR", "organization_id required.", undefined, 422);
    }

    const actor = buildActor(ctx);
    const decision = await can("org:manage_members", actor, { type: "org", id: orgId, ownerId: orgId });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const applicants = await listApplicantsForOrganization({ organizationId: orgId });

    return apiOk({ applicants, organization_id: orgId });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.victims.list.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
