/**
 * Phase 7: Case timeline – list events for a case (case-view scoped; victims see redacted note events).
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { listCaseTimeline } from "@/lib/server/data";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id: caseId } = await context.params;
    if (!caseId) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "Missing case id" } },
        { status: 400 }
      );
    }

    const events = await listCaseTimeline({ caseId, ctx });

    logEvent({
      ctx,
      action: "case.timeline_viewed",
      resourceType: "case",
      resourceId: caseId,
      metadata: { case_id: caseId },
      req,
    }).catch(() => {});

    return apiOk({ events });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("cases.timeline.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
