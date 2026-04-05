import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFail, apiFailFromError, apiOk, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getOrganizationSignals } from "@/lib/server/orgSignals/aggregate";

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
      return apiFail("VALIDATION_ERROR", "We couldn't match that organization. Open it again from your list or dashboard.", undefined, 422);
    }

    const signals = await getOrganizationSignals(organizationId);
    return apiOk({ organization_id: organizationId, signals });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.org_signals.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

