/**
 * Phase C: Run internal org quality grading (admin only).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import {
  getLatestOrgQualityScore,
  evaluateOrgQualityScore,
} from "@/lib/server/grading/service";
import { ORG_GRADING_VERSION } from "@/lib/server/grading/config";

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
      const existing = await getLatestOrgQualityScore(organizationId);
      if (existing) {
        return apiOk({
          cached: true,
          score: existing,
          score_version: existing.score_version,
        });
      }
    }

    await logEvent({
      ctx,
      action: "grading.run_started",
      resourceType: "organization",
      resourceId: organizationId,
      organizationId,
      metadata: {
        organization_id: organizationId,
        score_version: ORG_GRADING_VERSION,
        force_recompute: forceRecompute,
      },
      req,
    }).catch(() => {});

    try {
      const { row, evaluation } = await evaluateOrgQualityScore({
        organizationId,
        actorUserId: ctx.userId,
      });

      await logEvent({
        ctx,
        action: "grading.run_completed",
        resourceType: "organization",
        resourceId: organizationId,
        organizationId,
        metadata: {
          organization_id: organizationId,
          score_version: ORG_GRADING_VERSION,
          overall_score: row.overall_score,
          score_confidence: row.score_confidence,
          flag_count: row.flags.length,
        },
        req,
      }).catch(() => {});

      return apiOk({
        cached: false,
        score: row,
        evaluation_summary: {
          overall_score: evaluation.overall_score,
          score_confidence: evaluation.score_confidence,
          flags: evaluation.flags,
        },
      });
    } catch (err) {
      await logEvent({
        ctx,
        action: "grading.run_failed",
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
    logger.error("admin.grading.run.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
