/**
 * Organization structured profile — read / update.
 * Domain 3.2: GET uses can("org:view_profile"), POST uses can("org:edit_profile").
 * Responses pass through serializeOrgInternalView (members) or serializeOrgAdminView (platform admin).
 */

import {
  getAuthContext,
  requireFullAccess,
  requireOrg,
} from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { getOrganizationProfileForContext, updateOrganizationProfile } from "@/lib/server/organizations/profile";
import { logEvent } from "@/lib/server/audit/logEvent";
import {
  serializeOrgInternalView,
  serializeOrgAdminView,
} from "@/lib/server/organizations/organizationSerializers";
import { syncOrgToIndex } from "@/lib/server/search/indexSync";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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

    const orgId = (isAdmin ? orgIdParam ?? ctx.orgId : ctx.orgId)!;

    const actor = buildActor(ctx);
    const decision = await can("org:view_profile", actor, { type: "org", id: orgId, ownerId: orgId });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const profile = await getOrganizationProfileForContext({ ctx, organizationId: orgId });
    const serialized = isAdmin ? serializeOrgAdminView(profile) : serializeOrgInternalView(profile);
    return apiOk({ profile: serialized });
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
    }

    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("organization_id")?.trim() || null;
    if (isAdmin && !orgIdParam && !ctx.orgId) {
      return apiFail("VALIDATION_ERROR", "organization_id required for admin", undefined, 422);
    }

    const orgId = (isAdmin ? orgIdParam ?? ctx.orgId : ctx.orgId)!;

    const actor = buildActor(ctx);
    const decision = await can("org:edit_profile", actor, { type: "org", id: orgId, ownerId: orgId });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
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
      organizationId: orgId,
      req,
    });

    const rowId = result.row.id;
    const metaBase = {
      organization_id: rowId,
      updated_sections: result.updatedKeys,
    };

    logEvent({
      ctx,
      action: "org.profile_updated",
      resourceType: "organization",
      resourceId: rowId,
      organizationId: rowId,
      metadata: metaBase,
      req,
    }).catch(() => {});

    if (result.profileStatusChanged) {
      logEvent({
        ctx,
        action: "org.profile_status_changed",
        resourceType: "organization",
        resourceId: rowId,
        organizationId: rowId,
        metadata: {
          ...metaBase,
          from: result.prevProfileStatus,
          to: result.row.profile_status,
        },
        req,
      }).catch(() => {});
    }

    // Domain 3.4 — Wire search index sync (fire-and-forget, must not block response).
    void syncOrgToIndex({ organizationId: rowId }, getSupabaseAdmin()).catch((err) =>
      logger.warn("syncOrgToIndex.error", { organizationId: rowId, error: (err as Error).message })
    );

    const serialized = isAdmin ? serializeOrgAdminView(result.row) : serializeOrgInternalView(result.row);
    return apiOk({ profile: serialized });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.profile.post.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
