import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getReferral, rejectReferral } from "@/lib/server/referrals/referralService";
import { buildTargetOrgView } from "@/lib/server/referrals/referralViews";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const rejectBodySchema = z.object({
  reason: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    if (!id?.trim()) {
      return apiFail("VALIDATION_ERROR", "Missing referral id.", undefined, 400);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = rejectBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiFail("VALIDATION_ERROR", "Invalid request body.", parsed.error.flatten(), 422);
    }

    const referral = await getReferral({ ctx, id: id.trim() });

    const actor = buildActor(ctx);
    const decision = await can("referral:reject", actor, {
      type: "referral",
      id: referral.id,
      tenantId: referral.target_organization_id,
      status: referral.status,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const updated = await rejectReferral({ ctx, id: id.trim(), reason: parsed.data.reason });
    return apiOk({ referral: await buildTargetOrgView(updated.id) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("referrals.reject.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
