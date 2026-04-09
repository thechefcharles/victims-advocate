import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiFail, apiFailFromError, apiOk, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getOrganizationSignals } from "@/lib/server/orgSignals/aggregate";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("organization_id")?.trim() || null;
    const organizationId = ctx.isAdmin ? orgIdParam ?? ctx.orgId : ctx.orgId;

    if (!organizationId) {
      return apiFail("VALIDATION_ERROR", "organization_id required.", undefined, 422);
    }

    const actor = buildActor(ctx);
    const decision = await can("org:manage_members", actor, {
      type: "org",
      id: organizationId,
      ownerId: organizationId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const signals = await getOrganizationSignals(organizationId);
    return apiOk({ signals });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.signals.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
