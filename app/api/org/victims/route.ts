/**
 * Victims (case owners) across all cases tied to the organization.
 * Org admin, supervisor, or platform admin.
 */

import {
  getAuthContext,
  requireFullAccess,
  requireOrg,
  requireOrgRole,
  SIMPLE_ORG_LEADERSHIP_ROLES,
} from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { listVictimsForOrganization } from "@/lib/server/org/listVictimsForOrganization";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const isAdmin = ctx.isAdmin;
    if (!isAdmin) {
      requireOrg(ctx);
      requireOrgRole(ctx, SIMPLE_ORG_LEADERSHIP_ROLES);
    }

    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("organization_id")?.trim();
    const orgId = isAdmin && orgIdParam ? orgIdParam : ctx.orgId!;

    if (!orgId) {
      return apiFail("VALIDATION_ERROR", "organization_id required for admin", undefined, 422);
    }

    const victims = await listVictimsForOrganization({ organizationId: orgId });

    return apiOk({ victims, organization_id: orgId });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.victims.list.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
