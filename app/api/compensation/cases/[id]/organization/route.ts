/**
 * Case owner updates which organization is linked to this case (case-specific).
 * Pass organization_id: null to reset to the platform legacy org (no victim-services org).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getCaseById, appendCaseTimelineEvent } from "@/lib/server/data";
import { sameUserId } from "@/lib/server/data/ids";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import {
  applyCaseOrganizationTransfer,
  resolveTargetOrganizationIdForOwnerPatch,
} from "@/lib/server/cases/transfer";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function organizationDisplayName(organizationId: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("organizations").select("name").eq("id", organizationId).maybeSingle();
  return ((data?.name as string) ?? "").trim() || "Organization";
}

export async function PATCH(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id: caseId } = await context.params;
    if (!caseId?.trim()) {
      return apiFail("VALIDATION_ERROR", "Missing case id", undefined, 400);
    }

    const result = await getCaseById({ caseId, ctx, req });
    if (!result) {
      return apiFail("FORBIDDEN", "Access denied", undefined, 403);
    }

    const ownerId = result.case.owner_user_id as string;
    if (!sameUserId(ownerId, ctx.userId)) {
      return apiFail("FORBIDDEN", "Only the case owner can change the organization", undefined, 403);
    }

    const body = await req.json().catch(() => ({}));
    const rawOrg = body?.organization_id;

    let targetOrgId: string;
    try {
      targetOrgId = await resolveTargetOrganizationIdForOwnerPatch(rawOrg);
    } catch (e) {
      const appErr = toAppError(e);
      return apiFailFromError(appErr);
    }

    const previousOrgId = result.case.organization_id as string | null;

    await applyCaseOrganizationTransfer({
      caseId,
      targetOrganizationId: targetOrgId,
    });

    const [prevName, nextName] = await Promise.all([
      previousOrgId ? organizationDisplayName(previousOrgId) : Promise.resolve("Previous organization"),
      organizationDisplayName(targetOrgId),
    ]);

    try {
      await appendCaseTimelineEvent({
        caseId,
        organizationId: targetOrgId,
        actor: { userId: ctx.userId, role: ctx.role },
        eventType: "case.organization_transferred",
        title: "Organization link updated",
        description:
          previousOrgId && previousOrgId !== targetOrgId
            ? `Case organization changed from ${prevName} to ${nextName}.`
            : `Case organization set to ${nextName}.`,
        metadata: {
          from_organization_id: previousOrgId,
          to_organization_id: targetOrgId,
          source: "owner_patch",
        },
      });
    } catch (timelineErr) {
      logger.warn("compensation.cases.organization.timeline_failed", {
        caseId,
        message: timelineErr instanceof Error ? timelineErr.message : String(timelineErr),
      });
    }

    await logEvent({
      ctx,
      action: "case.organization_transferred",
      resourceType: "case",
      resourceId: caseId,
      organizationId: targetOrgId,
      metadata: {
        from_organization_id: previousOrgId,
        to_organization_id: targetOrgId,
        source: "owner_patch",
      },
      req,
    });

    logger.info("compensation.cases.organization.updated", {
      caseId,
      organizationId: targetOrgId,
      userId: ctx.userId,
    });

    return apiOk({ organization_id: targetOrgId });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.organization.patch.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
