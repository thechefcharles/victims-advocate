/**
 * Advocate-facing: same provider map payload as the applicant route.
 * Domain 3.4: uses can("provider_search:browse") gate — any authenticated user allowed.
 * Data sourced from provider_search_index (Search Law compliant).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { loadOrganizationsMapRows } from "@/lib/server/organizations/organizationsMapData";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("provider_search:browse", actor, {
      type: "provider_search" as const,
      id: "all",
      ownerId: "",
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const organizations = await loadOrganizationsMapRows();
    return apiOk({ organizations });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("organizations-map.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
