import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getReferral, acceptReferral } from "@/lib/server/referrals/referralService";
import { buildTargetOrgView } from "@/lib/server/referrals/referralViews";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    if (!id?.trim()) {
      return apiFail("VALIDATION_ERROR", "Missing referral id.", undefined, 400);
    }

    const referral = await getReferral({ ctx, id: id.trim() });

    const actor = buildActor(ctx);
    const decision = await can("referral:accept", actor, {
      type: "referral",
      id: referral.id,
      tenantId: referral.target_organization_id,
      status: referral.status,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const updated = await acceptReferral({ ctx, id: id.trim() });
    return apiOk({ referral: await buildTargetOrgView(updated.id) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("referrals.accept.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
