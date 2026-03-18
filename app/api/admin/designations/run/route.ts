/**
 * Phase D: Compute and persist org designation (admin only).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import {
  getCurrentOrgDesignation,
  computeAndPersistDesignation,
} from "@/lib/server/designations/service";
import { ORG_DESIGNATION_VERSION } from "@/lib/designations/version";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const organizationId = String(body?.organization_id ?? "").trim();
    const forceRecompute = Boolean(body?.force_recompute);

    if (!organizationId) {
      return apiFail("VALIDATION_ERROR", "organization_id required", undefined, 422);
    }

    if (!forceRecompute) {
      const existing = await getCurrentOrgDesignation(organizationId);
      if (existing) {
        return apiOk({
          cached: true,
          designation: existing,
          note: "Run with force_recompute to refresh from latest grading",
        });
      }
    }

    await logEvent({
      ctx,
      action: "designation.run_started",
      resourceType: "organization",
      resourceId: organizationId,
      organizationId,
      metadata: {
        organization_id: organizationId,
        designation_version: ORG_DESIGNATION_VERSION,
        force_recompute: forceRecompute,
      },
      req,
    }).catch(() => {});

    try {
      const { row, evaluation } = await computeAndPersistDesignation({
        organizationId,
        actorUserId: ctx.userId,
      });

      await logEvent({
        ctx,
        action: "designation.run_completed",
        resourceType: "organization",
        resourceId: organizationId,
        organizationId,
        metadata: {
          organization_id: organizationId,
          designation_version: ORG_DESIGNATION_VERSION,
          designation_tier: row.designation_tier,
          designation_confidence: row.designation_confidence,
          grading_run_linked: Boolean(row.grading_run_id),
        },
        req,
      }).catch(() => {});

      return apiOk({
        cached: false,
        designation: row,
        evaluation_meta: {
          designation_tier: evaluation.designation_tier,
          designation_confidence: evaluation.designation_confidence,
          grading_run_id: evaluation.grading_snapshot.grading_run_id,
        },
      });
    } catch (err) {
      await logEvent({
        ctx,
        action: "designation.run_failed",
        resourceType: "organization",
        resourceId: organizationId,
        organizationId,
        metadata: {
          organization_id: organizationId,
          error: String((err as Error)?.message ?? err).slice(0, 400),
        },
        req,
      }).catch(() => {});
      throw err;
    }
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.designations.run.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
