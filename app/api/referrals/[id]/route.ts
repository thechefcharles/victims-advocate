import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getReferral } from "@/lib/server/referrals/referralService";
import {
  serializeForSourceOrg,
  serializeForApplicant,
  serializeForAdmin,
} from "@/lib/server/referrals/referralSerializer";
import { buildTargetOrgView } from "@/lib/server/referrals/referralViews";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    if (!id?.trim()) {
      return apiFail("VALIDATION_ERROR", "Missing referral id.", undefined, 400);
    }

    const referral = await getReferral({ ctx, id: id.trim() });

    const actor = buildActor(ctx);
    const decision = await can("referral:view", actor, {
      type: "referral",
      id: referral.id,
      ownerId: referral.applicant_id,
      tenantId: referral.source_organization_id,
      status: referral.status,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    let serialized;
    if (ctx.isAdmin) {
      serialized = serializeForAdmin(referral);
    } else if (ctx.accountType === "applicant") {
      serialized = serializeForApplicant(referral);
    } else if (ctx.orgId === referral.source_organization_id) {
      serialized = serializeForSourceOrg(referral);
    } else {
      // Receiving (target) org — status-branched masking enforced by
      // buildTargetOrgView: preview while pending_acceptance, governed
      // share package once accepted, minimal {id, status} on any
      // rejected/cancelled/closed/draft row (no applicant data leak).
      serialized = await buildTargetOrgView(referral.id);
    }

    return apiOk({ referral: serialized });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("referrals.get.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
