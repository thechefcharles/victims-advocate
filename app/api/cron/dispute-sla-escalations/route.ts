/**
 * Daily — flag signal disputes whose 30-day SLA has passed without resolution.
 * Delegates to signalDisputeService.checkSlaEscalations (idempotent).
 */

import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { checkSlaEscalations } from "@/lib/server/trust/signalDisputeService";
import { writeCronRun } from "@/lib/server/cron/cronRunLogger";

export const runtime = "nodejs";
const CRON_NAME = "dispute-sla-escalations";

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
    const result = await checkSlaEscalations();
    logger.info("cron.dispute_sla_escalations.ok", result);
    await writeCronRun(CRON_NAME, "success", null, result as Record<string, unknown>);
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("cron.dispute_sla_escalations.error", { code: appErr.code });
    await writeCronRun(CRON_NAME, "error", appErr.message ?? "Unknown error");
    return apiFailFromError(appErr);
  }
}

export const GET = POST;
