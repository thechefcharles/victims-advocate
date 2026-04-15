import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createReferral, listReferrals, listReferralsForApplicant } from "@/lib/server/referrals/referralService";
import { serializeForSourceOrg, serializeForApplicant, serializeForAdmin } from "@/lib/server/referrals/referralSerializer";
import { buildTargetOrgView } from "@/lib/server/referrals/referralViews";
import { z } from "zod";

const createReferralBodySchema = z.object({
  source_organization_id: z.string().uuid(),
  target_organization_id: z.string().uuid(),
  applicant_id: z.string().uuid(),
  case_id: z.string().uuid().nullable().optional(),
  support_request_id: z.string().uuid().nullable().optional(),
  reason: z.string().max(2000).nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);

    if (ctx.accountType === "applicant") {
      const decision = await can("referral:view", actor, { type: "referral", id: null, ownerId: ctx.userId });
      if (!decision.allowed) {
        return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
      }
      const rows = await listReferralsForApplicant({ ctx });
      return apiOk({ referrals: rows.map(serializeForApplicant) });
    }

    const { searchParams } = new URL(req.url);
    const orgId = ctx.isAdmin
      ? (searchParams.get("organization_id") ?? ctx.orgId)
      : ctx.orgId;

    if (!orgId) {
      return apiFail("VALIDATION_ERROR", "organization_id required.", undefined, 422);
    }

    const direction = (searchParams.get("direction") as "outgoing" | "incoming" | null) ?? "outgoing";
    if (direction !== "outgoing" && direction !== "incoming") {
      return apiFail("VALIDATION_ERROR", "direction must be 'outgoing' or 'incoming'.", undefined, 422);
    }

    const decision = await can("referral:view", actor, { type: "referral", id: null, tenantId: orgId });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const rows = await listReferrals({ ctx, orgId, direction });
    const serialized = ctx.isAdmin
      ? rows.map(serializeForAdmin)
      : direction === "outgoing"
        ? rows.map((r) => serializeForSourceOrg(r))
        : // Receiving inbox — status-branched masking enforced per row.
          await Promise.all(rows.map((r) => buildTargetOrgView(r.id)));

    return apiOk({ referrals: serialized, direction });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("referrals.list.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json();
    const parsed = createReferralBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiFail("VALIDATION_ERROR", "Invalid referral input.", parsed.error.flatten(), 422);
    }

    const actor = buildActor(ctx);
    const decision = await can("referral:create", actor, {
      type: "referral",
      id: null,
      tenantId: parsed.data.source_organization_id,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const referral = await createReferral({
      ctx,
      input: {
        sourceOrganizationId: parsed.data.source_organization_id,
        targetOrganizationId: parsed.data.target_organization_id,
        applicantId: parsed.data.applicant_id,
        caseId: parsed.data.case_id,
        supportRequestId: parsed.data.support_request_id,
        reason: parsed.data.reason,
      },
    });

    return apiOk({ referral: serializeForSourceOrg(referral) }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("referrals.create.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
