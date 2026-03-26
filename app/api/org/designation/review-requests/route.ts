/**
 * Phase E: List designation review requests for current org.
 */

import {
  getAuthContext,
  requireFullAccess,
  requireOrg,
  requireOrgRole,
  SIMPLE_ORG_LEADERSHIP_ROLES,
} from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { listDesignationReviewRequestsForOrg } from "@/lib/server/designations/reviewRequests";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireOrg(ctx);
    requireOrgRole(ctx, SIMPLE_ORG_LEADERSHIP_ROLES);

    const list = await listDesignationReviewRequestsForOrg({
      organizationId: ctx.orgId!,
      limit: 40,
    });

    const safe = list.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      request_kind: r.request_kind,
      subject: r.subject,
      body: r.body,
      status: r.status,
      admin_response_org_visible: r.admin_response_org_visible,
      resolved_at: r.resolved_at,
    }));

    return apiOk({ requests: safe });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.designation.review-requests.get.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
