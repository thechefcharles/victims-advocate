/**
 * Phase 11: Case routing – run routing for a case (POST) or get latest result (GET).
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { getCaseById, appendCaseTimelineEvent } from "@/lib/server/data";
import { runRouting, getLatestRoutingRun } from "@/lib/server/routing";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET: return latest routing result for the case (view access). */
export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;

    if (!id) {
      return apiFail("VALIDATION_ERROR", "Missing case id", undefined, 400);
    }

    const result = await getLatestRoutingRun({ caseId: id, ctx });
    if (!result) {
      return apiOk({ routing: null, result: null });
    }

    return apiOk({
      routing: { id: result.run.id, created_at: result.run.created_at },
      result: result.result,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.routing.get.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}

/** POST: run routing for the case, persist result, append timeline, return result. */
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
      return apiFail("FORBIDDEN", "Only advocates or admins can run routing", undefined, 403);
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body?.dryRun);

    await logEvent({
      ctx,
      action: "routing.run_started",
      resourceType: "case",
      resourceId: id,
      metadata: { case_id: id, dry_run: dryRun },
      req,
    }).catch(() => {});

    let runResult;
    try {
      runResult = await runRouting({ caseId: id, ctx, dryRun });
    } catch (err) {
      await logEvent({
        ctx,
        action: "routing.run_failed",
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
        action: "routing.run_completed",
        resourceType: "case",
        resourceId: id,
        metadata: { case_id: id, program_count: runResult.programs.length },
        req,
      }).catch(() => {});

      await appendCaseTimelineEvent({
        caseId: id,
        organizationId: caseResult.case.organization_id as string,
        actor: { userId: ctx.userId, role: caseResult.access.role },
        eventType: "case.routing_evaluated",
        title: "Program routing evaluated",
        description: `${runResult.programs.length} program(s) evaluated.`,
        metadata: {},
      });
    }

    logger.info("compensation.cases.routing.run", {
      caseId: id,
      userId: ctx.userId,
      programCount: runResult.programs.length,
    });

    return apiOk({ result: runResult });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.routing.post.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
