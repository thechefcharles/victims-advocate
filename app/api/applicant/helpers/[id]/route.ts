/**
 * Domain 5.1 — GET /api/applicant/helpers/[id]
 * Fetch a single trusted helper grant.
 *
 * Note: revoke lives at /api/applicant/helpers/[id]/revoke (POST action endpoint).
 * PATCH is not supported — use the explicit action endpoints instead.
 */

import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getTrustedHelperAccess } from "@/lib/server/trustedHelper/trustedHelperService";
import {
  serializeForApplicant,
  serializeForHelperSelf,
  serializeForAdmin,
} from "@/lib/server/trustedHelper/trustedHelperSerializer";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    const { id } = await context.params;
    const grant = await getTrustedHelperAccess({ ctx, id });

    const actor = buildActor(ctx);
    const decision = await can("trusted_helper:view", actor, {
      type: "trusted_helper",
      id,
      ownerId: grant.applicant_user_id,
      assignedTo: grant.helper_user_id,
      status: grant.status,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    // Context-aware serializer selection
    if (ctx.isAdmin) {
      return apiOk({ grant: serializeForAdmin(grant) });
    }
    if (ctx.userId === grant.applicant_user_id) {
      return apiOk({ grant: serializeForApplicant(grant) });
    }
    // Helper self-view
    return apiOk({ grant: serializeForHelperSelf(grant) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("applicant.helpers.get.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
