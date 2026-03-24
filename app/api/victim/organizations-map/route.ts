/**
 * Victim-facing: active organizations with map coordinates for the Find Organizations page.
 * Coordinates may be org-supplied (metadata) or approximate from coverage area.
 */

import { getAuthContext, requireAuth, requireRole } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { loadOrganizationsMapRows } from "@/lib/server/organizations/organizationsMapData";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireRole(ctx, "victim");

    const organizations = await loadOrganizationsMapRows();

    return apiOk({ organizations });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("victim.organizations-map.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
