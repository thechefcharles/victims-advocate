import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { postCaseOrgReferralBodySchema } from "@/lib/server/referrals/schema";
import { createReferral, listCaseOrgReferralsSummaryForViewer } from "@/lib/server/referrals/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id: caseId } = await context.params;
    if (!caseId?.trim()) {
      return apiFail("VALIDATION_ERROR", "Missing case id", undefined, 400);
    }

    const referrals = await listCaseOrgReferralsSummaryForViewer({
      ctx,
      caseId: caseId.trim(),
      req,
    });
    if (referrals === null) {
      return apiFail("FORBIDDEN", "Access denied", undefined, 403);
    }

    return apiOk({ referrals });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("cases.org-referrals.get.error", {
        code: appErr.code,
        message: appErr.message,
      });
    }
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id: caseId } = await context.params;
    if (!caseId?.trim()) {
      return apiFail("VALIDATION_ERROR", "Missing case id", undefined, 400);
    }

    const raw = await req.json().catch(() => ({}));
    const parsed = postCaseOrgReferralBodySchema.safeParse(raw);
    if (!parsed.success) {
      return apiFail("VALIDATION_ERROR", "Some referral fields need another look. Check the form and try again.", parsed.error.flatten(), 422);
    }

    const { to_organization_id, metadata } = parsed.data;

    const referral = await createReferral({
      ctx,
      input: {
        caseId: caseId.trim(),
        toOrganizationId: to_organization_id,
        metadata: metadata ?? undefined,
      },
      req,
    });

    return apiOk({ referral }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("cases.org-referrals.post.error", {
        code: appErr.code,
        message: appErr.message,
      });
    }
    return apiFailFromError(appErr);
  }
}
