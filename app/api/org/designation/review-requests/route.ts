/**
 * List designation review requests for current org.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { listDesignationReviewRequestsForOrg } from "@/lib/server/designations/reviewRequests";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const orgId = ctx.orgId;
    if (!orgId) {
      return apiFail("FORBIDDEN", "Organization context required.", undefined, 403);
    }

    const actor = buildActor(ctx);
    const decision = await can("org:manage_members", actor, { type: "org", id: orgId, ownerId: orgId });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const list = await listDesignationReviewRequestsForOrg({
      organizationId: orgId,
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
