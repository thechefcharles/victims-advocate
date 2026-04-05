/**
 * Phase A: Organization structured profile (read / update).
 * GET: org members (any role) or admin with ?organization_id=
 * POST: org_admin, supervisor, or admin
 */

import {
  getAuthContext,
  requireFullAccess,
  requireOrg,
  requireOrgRole,
  SIMPLE_ORG_LEADERSHIP_ROLES,
} from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getOrganizationProfileForContext, updateOrganizationProfile } from "@/lib/server/organizations/profile";
import { logEvent } from "@/lib/server/audit/logEvent";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const isAdmin = ctx.isAdmin;
    if (!isAdmin) {
      requireOrg(ctx);
    }

    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("organization_id")?.trim() || null;
    if (isAdmin && !orgIdParam && !ctx.orgId) {
      return apiFail("VALIDATION_ERROR", "organization_id required for admin", undefined, 422);
    }

    const profile = await getOrganizationProfileForContext({
      ctx,
      organizationId: isAdmin ? orgIdParam ?? ctx.orgId : ctx.orgId,
    });

    const { metadata: _m, ...rest } = profile;
    return apiOk({ profile: rest });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.profile.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const isAdmin = ctx.isAdmin;
    if (!isAdmin) {
      requireOrg(ctx);
      requireOrgRole(ctx, SIMPLE_ORG_LEADERSHIP_ROLES);
    }

    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("organization_id")?.trim() || null;
    if (isAdmin && !orgIdParam && !ctx.orgId) {
      return apiFail("VALIDATION_ERROR", "organization_id required for admin", undefined, 422);
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
    }

    const result = await updateOrganizationProfile({
      ctx,
      body,
      organizationId: isAdmin ? orgIdParam ?? ctx.orgId : ctx.orgId,
      req,
    });

    const orgId = result.row.id;
    const metaBase = {
      organization_id: orgId,
      updated_sections: result.updatedKeys,
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
    logger.error("org.profile.post.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
