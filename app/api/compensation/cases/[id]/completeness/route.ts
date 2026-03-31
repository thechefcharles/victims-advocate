/**
 * Phase 12: Case completeness – run evaluation (POST) or get latest result (GET).
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { getCaseById, appendCaseTimelineEvent } from "@/lib/server/data";
import { runCompletenessEvaluation, getLatestCompletenessRun } from "@/lib/server/completeness";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET: return latest completeness result for the case. */
export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;

    if (!id) {
      return apiFail("VALIDATION_ERROR", "Missing case id", undefined, 400);
    }

    const result = await getLatestCompletenessRun({ caseId: id, ctx });
    if (!result) {
      return apiOk({ completeness: null, result: null });
    }

    return apiOk({
      completeness: { id: result.run.id, created_at: result.run.created_at },
      result: result.result,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.completeness.get.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}

/** POST: run completeness evaluation, persist, append timeline, return result. */
export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;

    if (!id) {
      return apiFail("VALIDATION_ERROR", "Missing case id", undefined, 400);
    }

    const caseResult = await getCaseById({ caseId: id, ctx });
    if (!caseResult) {
      return apiFail("FORBIDDEN", "Access denied", undefined, 403);
    }
    if (!caseResult.access.can_edit && caseResult.access.role === "owner") {
      return apiFail("FORBIDDEN", "Only advocates or admins can run completeness evaluation", undefined, 403);
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body?.dryRun);

    await logEvent({
      ctx,
      action: "completeness.run_started",
      resourceType: "case",
      resourceId: id,
      metadata: { case_id: id, dry_run: dryRun },
      req,
    }).catch(() => {});

    let runResult;
    try {
      runResult = await runCompletenessEvaluation({ caseId: id, ctx, dryRun });
    } catch (err) {
      await logEvent({
        ctx,
        action: "completeness.run_failed",
        resourceType: "case",
        resourceId: id,
        metadata: { case_id: id, error: String(err) },
        req,
      }).catch(() => {});
      throw err;
    }

    if (!dryRun) {
      await logEvent({
        ctx,
        action: "completeness.run_completed",
        resourceType: "case",
        resourceId: id,
        metadata: { case_id: id, overall_status: runResult.overall_status },
        req,
      }).catch(() => {});

      const orgId = caseResult.case.organization_id as string | null;
      if (orgId) {
        await appendCaseTimelineEvent({
          caseId: id,
          organizationId: orgId,
          actor: { userId: ctx.userId, role: caseResult.access.role },
          eventType: "case.completeness_evaluated",
          title: "Documentation completeness evaluated",
          description: `Status: ${runResult.overall_status}. ${runResult.summary_counts.blocking_count} blocking, ${runResult.summary_counts.warning_count} warnings.`,
          metadata: {},
        });
      }
    }

    logger.info("compensation.cases.completeness.run", {
      caseId: id,
      userId: ctx.userId,
      overall_status: runResult.overall_status,
    });

    return apiOk({ result: runResult });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.completeness.post.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
