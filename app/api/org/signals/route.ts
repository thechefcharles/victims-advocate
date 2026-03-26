import {
  getAuthContext,
  requireFullAccess,
  requireOrg,
  requireOrgRole,
  SIMPLE_ORG_LEADERSHIP_ROLES,
} from "@/lib/server/auth";
import { apiFail, apiFailFromError, apiOk, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getOrganizationSignals } from "@/lib/server/orgSignals/aggregate";

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
    const orgIdParam = searchParams.get("organization_id")?.trim() || null;
    if (isAdmin && !orgIdParam && !ctx.orgId) {
      return apiFail("VALIDATION_ERROR", "organization_id required for admin", undefined, 422);
    }

    const organizationId = isAdmin ? orgIdParam ?? ctx.orgId : ctx.orgId;
    if (!organizationId) {
      return apiFail("FORBIDDEN", "Organization context required", undefined, 403);
    }

    const signals = await getOrganizationSignals(organizationId);
    return apiOk({ signals });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.signals.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

