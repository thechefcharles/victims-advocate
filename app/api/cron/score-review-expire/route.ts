/**
 * Daily — flip public_display_active=true on every trust_signal_summary row
 * whose 30-day private review window has expired. Idempotent.
 */

import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { activateExpiredReviews } from "@/lib/server/trust/reviewWindowService";
import { writeCronRun } from "@/lib/server/cron/cronRunLogger";

export const runtime = "nodejs";
const CRON_NAME = "score-review-expire";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  try {
    if (!authorized(req)) {
      return apiFail("FORBIDDEN", "Cron authentication required.", undefined, 403);
    }
    const result = await activateExpiredReviews();
    logger.info("cron.score_review_expire.ok", result);
    await writeCronRun(CRON_NAME, "success", null, result as Record<string, unknown>);
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("cron.score_review_expire.error", { code: appErr.code });
    await writeCronRun(CRON_NAME, "error", appErr.message ?? "Unknown error");
    return apiFailFromError(appErr);
  }
}

export const GET = POST;
