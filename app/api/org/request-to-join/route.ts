/**
 * POST /api/org/request-to-join — Org rep requests to join an existing organization.
 */

import { getAuthContext, requireAuth, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { createOrgJoinRequest } from "@/lib/server/organizations/orgJoinRequestService";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => null);
    if (!body) return apiFail("VALIDATION_ERROR", "We couldn't read that request.", undefined, 422);

    const organizationId = typeof (body as Record<string, unknown>)?.organization_id === "string"
      ? String((body as Record<string, unknown>).organization_id).trim() : "";
    if (!organizationId) return apiFail("VALIDATION_ERROR", "organization_id is required", undefined, 422);

    const actor = buildActor(ctx);
    const decision = await can("org:request_to_join", actor, { type: "org", id: organizationId, ownerId: organizationId });
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);

    const result = await createOrgJoinRequest(ctx, organizationId, req);
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.request_to_join.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
