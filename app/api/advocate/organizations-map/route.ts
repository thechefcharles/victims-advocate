/**
 * Advocate-facing: same organization map payload as victims (for “connect your organization”).
 */

import { getAuthContext, requireAuth, requireRole } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { loadOrganizationsMapRows } from "@/lib/server/organizations/organizationsMapData";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireRole(ctx, "advocate");

    const organizations = await loadOrganizationsMapRows();

    return apiOk({ organizations });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("advocate.organizations-map.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
