/**
 * GET victim account personal_info for org staff when the org has a case with that victim.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getPersonalInfoForUserId } from "@/lib/server/profile/getPersonalInfo";
import { orgHasVictimCase } from "@/lib/server/profile/applicantPersonalAccess";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ clientId: string }> }
) {
  try {
    const authCtx = await getAuthContext(req);
    requireFullAccess(authCtx, req);

    const { clientId } = await ctx.params;
    const victimId = String(clientId || "").trim();
    if (!victimId) {
      return apiFail("VALIDATION_ERROR", "Missing clientId", undefined, 400);
    }

    if (!authCtx.isAdmin) {
      const orgId = authCtx.orgId;
      if (!orgId) {
        return apiFail("FORBIDDEN", "Organization context required.", undefined, 403);
      }

      const actor = buildActor(authCtx);
      const decision = await can("org:view_cases", actor, { type: "org", id: orgId, ownerId: orgId });
      if (!decision.allowed) {
        return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
      }

      const allowed = await orgHasVictimCase(authCtx, victimId);
      if (!allowed) {
        return apiFail("FORBIDDEN", "No case with this victim for your organization", undefined, 403);
      }
    } else {
      const supabase = getSupabaseAdmin();
      const { data: c } = await supabase
        .from("cases")
        .select("id")
        .eq("owner_user_id", victimId)
        .limit(1)
        .maybeSingle();
      if (!c) {
        return apiFail("NOT_FOUND", "No cases for this user", undefined, 404);
      }
    }

    const personalInfo = await getPersonalInfoForUserId(victimId);
    logger.info("org.client.profile.read", {
      readerId: authCtx.userId,
      victimId,
    });
    return apiOk({ personalInfo, victimUserId: victimId });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.client.profile.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
