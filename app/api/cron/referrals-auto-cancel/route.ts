/**
 * Daily job — auto-cancel referrals stuck in pending_acceptance for >14 days.
 * Idempotent: skips rows that have already moved past pending_acceptance.
 */

import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { cancelStaleReferrals } from "@/lib/server/referrals/referralService";
import { writeCronRun } from "@/lib/server/cron/cronRunLogger";

export const runtime = "nodejs";
const CRON_NAME = "referrals-auto-cancel";

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
    const result = await cancelStaleReferrals();
    logger.info("cron.referrals_auto_cancel.ok", result);
    await writeCronRun(CRON_NAME, "success", null, result as Record<string, unknown>);
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("cron.referrals_auto_cancel.error", { code: appErr.code });
    await writeCronRun(CRON_NAME, "error", appErr.message ?? "Unknown error");
    return apiFailFromError(appErr);
  }
}

export const GET = POST;
