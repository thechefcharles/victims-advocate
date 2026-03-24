/**
 * Phase E: Submit designation review request (org_admin / supervisor).
 */

import {
  getAuthContext,
  requireFullAccess,
  requireOrg,
  requireOrgRole,
  ORG_LEADERSHIP_ROLES,
} from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { createDesignationReviewRequest } from "@/lib/server/designations/reviewRequests";
import type { ReviewRequestKind } from "@/lib/server/designations/reviewRequests";
import { getCurrentOrgDesignation } from "@/lib/server/designations/service";

const KINDS: ReviewRequestKind[] = ["clarification", "correction", "data_update"];

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireOrg(ctx);
    requireOrgRole(ctx, ORG_LEADERSHIP_ROLES);

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const requestKind = String(body?.request_kind ?? "").trim() as ReviewRequestKind;
    const subject = String(body?.subject ?? "").trim();
    const narrative = String(body?.body ?? "").trim();

    if (!KINDS.includes(requestKind)) {
      return apiFail("VALIDATION_ERROR", "request_kind must be clarification, correction, or data_update", undefined, 422);
    }
    if (subject.length < 5 || subject.length > 200) {
      return apiFail("VALIDATION_ERROR", "subject must be 5–200 characters", undefined, 422);
    }
    if (narrative.length < 20 || narrative.length > 8000) {
      return apiFail("VALIDATION_ERROR", "body must be 20–8000 characters", undefined, 422);
    }

    const orgId = ctx.orgId!;
    const des = await getCurrentOrgDesignation(orgId);

    const row = await createDesignationReviewRequest({
      organizationId: orgId,
      requestedByUserId: ctx.userId,
      requestKind,
      subject,
      body: narrative,
      designationTierSnapshot: des?.designation_tier ?? null,
      designationVersionSnapshot: des?.designation_version ?? null,
    });

    logEvent({
      ctx,
      action: "designation.review_submitted",
      resourceType: "designation_review_request",
      resourceId: row.id,
      organizationId: orgId,
      metadata: {
        request_id: row.id,
        request_kind: requestKind,
        designation_tier_snapshot: row.designation_tier_snapshot,
      },
      req,
    }).catch(() => {});

    return apiOk({ request: row });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.designation.review-request.post.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
