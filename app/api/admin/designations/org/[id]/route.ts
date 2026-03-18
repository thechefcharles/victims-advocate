/**
 * Phase D: Current designation + history for an org (admin only).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  getCurrentOrgDesignation,
  getOrgDesignationHistory,
} from "@/lib/server/designations/service";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteCtx) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const { id } = await params;
    const organizationId = id?.trim();
    if (!organizationId) {
      return apiFail("VALIDATION_ERROR", "Invalid organization id", undefined, 422);
    }

    const current = await getCurrentOrgDesignation(organizationId);
    const history = await getOrgDesignationHistory(organizationId, 15);

    return apiOk({
      organization_id: organizationId,
      current,
      history,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.designations.org.get.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
