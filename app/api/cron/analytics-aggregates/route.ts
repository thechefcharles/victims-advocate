/**
 * Hourly job — roll raw trust_signal_events into windowed aggregates and
 * refresh per-org summary snapshots. Invoked by Vercel Cron (or equivalent).
 *
 * Authorization: requires CRON_SECRET in the Authorization header. Any
 * external call without it gets a canonical FORBIDDEN response.
 */

import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { computeAllAggregates } from "@/lib/server/analytics/aggregationWorker";

export const runtime = "nodejs";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  try {
    if (!authorized(req)) {
      return apiFail("FORBIDDEN", "Cron authentication required.", undefined, 403);
    }
    const result = await computeAllAggregates();
    logger.info("cron.analytics_aggregates.ok", result);
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("cron.analytics_aggregates.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}

// Vercel Cron sends GET; accept both.
export const GET = POST;
