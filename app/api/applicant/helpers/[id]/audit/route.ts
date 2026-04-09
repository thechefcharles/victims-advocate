import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  getTrustedHelperAccess,
  listAuditEventsForGrant,
} from "@/lib/server/trustedHelper/trustedHelperService";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    const { id } = await context.params;
    const existing = await getTrustedHelperAccess({ ctx, id });

    const actor = buildActor(ctx);
    const decision = await can("trusted_helper:audit.view", actor, {
      type: "trusted_helper",
      id,
      ownerId: existing.applicant_user_id,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const events = await listAuditEventsForGrant({ ctx, id });
    return apiOk({ events });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("applicant.helpers.audit.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
