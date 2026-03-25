/**
 * Phase A: Admin org profile read/update by organization id.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  getOrganizationProfileForContext,
  updateOrganizationProfile,
} from "@/lib/server/organizations/profile";
import { logEvent } from "@/lib/server/audit/logEvent";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteCtx) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const { id } = await params;
    const orgId = id?.trim();
    if (!orgId) {
      return apiFail("VALIDATION_ERROR", "Invalid organization id", undefined, 422);
    }

    const profile = await getOrganizationProfileForContext({ ctx, organizationId: orgId });
    const { metadata: _m, ...rest } = profile;
    return apiOk({ profile: rest });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.org.profile.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request, { params }: RouteCtx) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const { id } = await params;
    const orgId = id?.trim();
    if (!orgId) {
      return apiFail("VALIDATION_ERROR", "Invalid organization id", undefined, 422);
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 422);
    }

    const result = await updateOrganizationProfile({ ctx, body, organizationId: orgId, req });

    const metaBase = {
      organization_id: orgId,
      updated_sections: result.updatedKeys,
      via: "admin_api",
    };

    logEvent({
      ctx,
      action: "org.profile_updated",
      resourceType: "organization",
      resourceId: orgId,
      organizationId: orgId,
      metadata: metaBase,
      req,
    }).catch(() => {});

    if (result.profileStatusChanged) {
      logEvent({
        ctx,
        action: "org.profile_status_changed",
        resourceType: "organization",
        resourceId: orgId,
        organizationId: orgId,
        metadata: {
          ...metaBase,
          from: result.prevProfileStatus,
          to: result.row.profile_status,
        },
        req,
      }).catch(() => {});
    }

    const { metadata: _m, ...rest } = result.row;
    return apiOk({ profile: rest });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.org.profile.post.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
