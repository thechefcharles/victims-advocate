/**
 * Daily job — produce an ecosystem-level analytics snapshot. Enforces the
 * MIN_ORG_COUNT k-anonymity gate at the worker layer; this route is a thin
 * cron entry point only.
 */

import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createEcosystemSnapshot } from "@/lib/server/analytics/aggregationWorker";
import { writeCronRun } from "@/lib/server/cron/cronRunLogger";

export const runtime = "nodejs";
const CRON_NAME = "analytics-ecosystem";

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
    const result = await createEcosystemSnapshot();
    logger.info("cron.analytics_ecosystem.ok", result);
    await writeCronRun(CRON_NAME, "success", null, result as Record<string, unknown>);
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("cron.analytics_ecosystem.error", { code: appErr.code });
    await writeCronRun(CRON_NAME, "error", appErr.message ?? "Unknown error");
    return apiFailFromError(appErr);
  }
}

export const GET = POST;
