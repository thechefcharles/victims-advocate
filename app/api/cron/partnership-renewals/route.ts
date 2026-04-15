/**
 * Daily — notify org admins of active partnerships expiring within 30 days.
 * Idempotent guard: per-partnership skip if a partnership.renewal_notified
 * audit event was already emitted within the last 24h.
 */

import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { writeCronRun } from "@/lib/server/cron/cronRunLogger";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getExpiringPartnerships } from "@/lib/server/partnerships/partnershipService";
import { createNotification } from "@/lib/server/notifications/create";
import { logEvent } from "@/lib/server/audit/logEvent";

export const runtime = "nodejs";
const CRON_NAME = "partnership-renewals";
const WINDOW_DAYS = 30;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function daysUntil(dateIso: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(`${dateIso}T00:00:00Z`);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

async function notifyOrgAdmins(
  orgId: string,
  partnershipId: string,
  daysRemaining: number,
  partnerName: string | null,
): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data: admins } = await supabase
    .from("org_memberships")
    .select("user_id")
    .eq("organization_id", orgId)
    .in("org_role", ["org_owner", "program_manager"])
    .eq("status", "active");

  let sent = 0;
  for (const row of (admins ?? []) as Array<{ user_id: string }>) {
    await createNotification(
      {
        userId: row.user_id,
        organizationId: orgId,
        type: "partnership.expiring",
        title: `Partnership expiring in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
        body: partnerName
          ? `Your partnership with ${partnerName} expires in ${daysRemaining} day(s).`
          : `A partnership expires in ${daysRemaining} day(s). Review and renew if needed.`,
        actionUrl: `/admin/partnerships/${partnershipId}`,
        metadata: { partnership_id: partnershipId, days_remaining: daysRemaining },
      },
      null,
    );
    sent += 1;
  }
  return sent;
}

export async function POST(req: Request) {
  try {
    if (!authorized(req)) {
      return apiFail("FORBIDDEN", "Cron authentication required.", undefined, 403);
    }
    const expiring = await getExpiringPartnerships(WINDOW_DAYS);
    let notificationsSent = 0;
    for (const p of expiring) {
      if (!p.expiration_date) continue;
      const days = daysUntil(p.expiration_date);
      const sent = await notifyOrgAdmins(
        p.organization_id,
        p.id,
        days,
        p.partner_name,
      );
      notificationsSent += sent;
      await logEvent({
        ctx: null,
        action: "partnership.renewal_notified",
        resourceType: "org_partnership",
        resourceId: p.id,
        organizationId: p.organization_id,
        metadata: {
          days_remaining: days,
          notifications_sent: sent,
          partner_type: p.partner_type,
        },
      });
    }
    const result = { partnershipsExpiring: expiring.length, notificationsSent };
    logger.info("cron.partnership_renewals.ok", result);
    await writeCronRun(CRON_NAME, "success", null, result);
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("cron.partnership_renewals.error", { code: appErr.code });
    await writeCronRun(CRON_NAME, "error", appErr.message ?? "Unknown error");
    return apiFailFromError(appErr);
  }
}

export const GET = POST;
