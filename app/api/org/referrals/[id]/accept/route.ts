import {
  getAuthContext,
  requireFullAccess,
  requireOrg,
  requireOrgRole,
  SIMPLE_ORG_LEADERSHIP_ROLES,
} from "@/lib/server/auth";
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

    if (!ctx.isAdmin) {
      requireOrg(ctx);
      requireOrgRole(ctx, SIMPLE_ORG_LEADERSHIP_ROLES);
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
