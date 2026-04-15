/**
 * GET /api/admin/voca/outcome-report
 *   Required: grant_year, start_date, end_date
 *   Optional: org_id
 * Admin only. Returns a structured VocaOutcomeReport for funder reporting.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { generateVocaOutcomeReport } from "@/lib/server/partnerships/vocaExportService";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only.", undefined, 403);
    }

    const url = new URL(req.url);
    const grantYear = url.searchParams.get("grant_year");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const orgId = url.searchParams.get("org_id");

    if (!grantYear || !startDate || !endDate) {
      return apiFail(
        "VALIDATION_ERROR",
        "grant_year, start_date, end_date are required.",
      );
    }

    const report = await generateVocaOutcomeReport(
      {
        grantYear,
        organizationId: orgId ?? undefined,
        dateRange: { start: startDate, end: endDate },
      },
      ctx,
    );
    return apiOk(report);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.voca.outcome_report.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
