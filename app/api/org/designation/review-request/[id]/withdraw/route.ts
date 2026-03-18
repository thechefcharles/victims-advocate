/**
 * Phase E: Withdraw pending designation review request (submitter or org admin).
 */

import { getAuthContext, requireFullAccess, requireOrg, requireOrgRole } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import {
  withdrawDesignationReviewRequest,
  getDesignationReviewRequestById,
} from "@/lib/server/designations/reviewRequests";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteCtx) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireOrg(ctx);
    requireOrgRole(ctx, ["org_admin", "supervisor"]);

    const asOrgAdmin = ctx.orgRole === "org_admin";

    const { id } = await params;
    const requestId = id?.trim();
    if (!requestId) {
      return apiFail("VALIDATION_ERROR", "Invalid id", undefined, 422);
    }

    const existing = await getDesignationReviewRequestById(requestId);
    if (!existing || existing.organization_id !== ctx.orgId) {
      return apiFail("NOT_FOUND", "Request not found", undefined, 404);
    }

    const row = await withdrawDesignationReviewRequest({
      id: requestId,
      organizationId: ctx.orgId!,
      actorUserId: ctx.userId,
      asOrgAdmin,
    });

    logEvent({
      ctx,
      action: "designation.review_withdrawn",
      resourceType: "designation_review_request",
      resourceId: requestId,
      organizationId: ctx.orgId!,
      metadata: { request_id: requestId },
      req,
    }).catch(() => {});

    return apiOk({ request: { id: row.id, status: row.status } });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.designation.review-withdraw.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
