/**
 * GET victim account personal_info for an advocate who has case access to that client.
 */

import { getAuthContext, requireFullAccess, requireRole } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getPersonalInfoForUserId } from "@/lib/server/profile/getPersonalInfo";
import { advocateHasClientAccess } from "@/lib/server/profile/applicantPersonalAccess";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ clientId: string }> }
) {
  try {
    const authCtx = await getAuthContext(req);
    requireFullAccess(authCtx, req);
    requireRole(authCtx, "advocate");

    const { clientId } = await ctx.params;
    const victimId = String(clientId || "").trim();
    if (!victimId) {
      return apiFail("VALIDATION_ERROR", "Missing clientId", undefined, 400);
    }

    const allowed = await advocateHasClientAccess(authCtx, victimId);
    if (!allowed) {
      return apiFail("FORBIDDEN", "No access to this client", undefined, 403);
    }

    const personalInfo = await getPersonalInfoForUserId(victimId);
    logger.info("advocate.client.profile.read", {
      advocateId: authCtx.userId,
      victimId,
    });
    return apiOk({ personalInfo, victimUserId: victimId });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("advocate.client.profile.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
