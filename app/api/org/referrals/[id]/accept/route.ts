import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { acceptCaseOrgReferral } from "@/lib/server/referrals/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const orgId = ctx.orgId;
    const resolvedOrgId = orgId ?? "";

    const actor = buildActor(ctx);
    const decision = await can("org:manage_members", actor, {
      type: "org",
      id: resolvedOrgId,
      ownerId: resolvedOrgId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const { id: referralId } = await context.params;
    if (!referralId?.trim()) {
      return apiFail("VALIDATION_ERROR", "Missing referral id", undefined, 400);
    }

    const referral = await acceptCaseOrgReferral({
      ctx,
      referralId: referralId.trim(),
      req,
    });

    return apiOk({ referral });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("org.referrals.accept.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
