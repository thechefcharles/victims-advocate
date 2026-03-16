import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getCaseById } from "@/lib/server/data";
import { getReviewStatus } from "@/lib/intake/reviewStatus";
import { parseApplicationFromCase } from "@/lib/intake/apiHelpers";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const url = new URL(req.url);
    const caseId = url.searchParams.get("caseId") ?? url.searchParams.get("case_id");
    if (!caseId) {
      return apiFail("VALIDATION_ERROR", "caseId query is required", undefined, 400);
    }

    const result = await getCaseById({ caseId, ctx });
    if (!result) return apiFail("FORBIDDEN", "Access denied", undefined, 403);

    const application = parseApplicationFromCase(result.case as Record<string, unknown>);
    if (!application) {
      return NextResponse.json({
        ok: true,
        data: {
          missing: [],
          skipped: [],
          deferred: [],
          required: [],
          canComplete: false,
        },
      });
    }

    const review = getReviewStatus(application);
    logger.info("intake.review_status", { caseId, userId: ctx.userId });
    return NextResponse.json({ ok: true, data: review });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("intake.review_status.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
