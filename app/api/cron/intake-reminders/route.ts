/**
 * Daily — send any intake reminders whose scheduled_for has arrived.
 * Idempotent; only processes rows with status='pending'.
 */

import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { processReminders } from "@/lib/server/denialPrevention";
import { writeCronRun } from "@/lib/server/cron/cronRunLogger";

export const runtime = "nodejs";
const CRON_NAME = "intake-reminders";

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
    const result = await processReminders();
    logger.info("cron.intake_reminders.ok", result);
    await writeCronRun(CRON_NAME, "success", null, result as Record<string, unknown>);
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("cron.intake_reminders.error", { code: appErr.code });
    await writeCronRun(CRON_NAME, "error", appErr.message ?? "Unknown error");
    return apiFailFromError(appErr);
  }
}

export const GET = POST;
