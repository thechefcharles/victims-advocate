/**
 * Domain 5.3 — Intake reminder engine.
 *
 * For each missing item on an intake, schedule three reminders at
 * 7 / 14 / 21 days from now. `processReminders` is the cron entry point
 * that sends due reminders via the notification service and marks them sent.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createNotification } from "@/lib/server/notifications/create";

const REMINDER_DAYS = [7, 14, 21] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function scheduleReminders(params: {
  intakeSessionId: string;
  applicantUserId: string;
  missingItems: string[];
  channel?: "email" | "sms" | "in_app";
  supabase?: SupabaseClient;
}): Promise<{ scheduled: number }> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  if (params.missingItems.length === 0) return { scheduled: 0 };

  const now = Date.now();
  const rows = [] as Array<{
    intake_session_id: string;
    reminder_type: string;
    missing_item: string;
    scheduled_for: string;
    channel: string;
    status: string;
  }>;

  for (const item of params.missingItems) {
    for (const days of REMINDER_DAYS) {
      rows.push({
        intake_session_id: params.intakeSessionId,
        reminder_type: `day_${days}`,
        missing_item: item,
        scheduled_for: new Date(now + days * DAY_MS).toISOString(),
        channel: params.channel ?? "in_app",
        status: "pending",
      });
    }
  }

  // UNIQUE (intake_session_id, missing_item, reminder_type) → idempotent
  // across repeated calls; re-running scheduleReminders silently skips dupes.
  await supabase
    .from("intake_reminders")
    .upsert(rows, {
      onConflict: "intake_session_id,missing_item,reminder_type",
      ignoreDuplicates: true,
    });

  return { scheduled: rows.length };
}

export async function processReminders(
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{ sent: number }> {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("intake_reminders")
    .select("id, intake_session_id, missing_item, reminder_type, channel")
    .eq("status", "pending")
    .lte("scheduled_for", nowIso);

  const rows = (data ?? []) as Array<{
    id: string;
    intake_session_id: string;
    missing_item: string;
    reminder_type: string;
    channel: string;
  }>;
  if (rows.length === 0) return { sent: 0 };

  let sent = 0;
  for (const r of rows) {
    // Resolve the applicant's user_id from the session row. Skip if missing.
    const { data: session } = await supabase
      .from("intake_sessions")
      .select("owner_user_id, organization_id")
      .eq("id", r.intake_session_id)
      .maybeSingle();
    const userId = (session as { owner_user_id?: string } | null)?.owner_user_id;
    if (!userId) continue;

    await createNotification(
      {
        userId,
        organizationId: (session as { organization_id?: string | null } | null)?.organization_id ?? null,
        type: `intake.reminder.${r.reminder_type}`,
        title: "Your application has an outstanding item",
        body: `Reminder: ${r.missing_item}`,
        previewSafe: true,
        metadata: {
          intake_session_id: r.intake_session_id,
          missing_item: r.missing_item,
          reminder_type: r.reminder_type,
        },
      },
      null,
    ).catch(() => {
      /* notifications are best-effort */
    });

    await supabase
      .from("intake_reminders")
      .update({ sent_at: nowIso, status: "sent" })
      .eq("id", r.id);
    sent += 1;
  }

  return { sent };
}

export function buildReminderSchedule(missingItems: string[], now = new Date()): Array<{
  missingItem: string;
  reminderType: string;
  scheduledFor: string;
}> {
  const out: Array<{ missingItem: string; reminderType: string; scheduledFor: string }> = [];
  for (const item of missingItems) {
    for (const days of REMINDER_DAYS) {
      out.push({
        missingItem: item,
        reminderType: `day_${days}`,
        scheduledFor: new Date(now.getTime() + days * DAY_MS).toISOString(),
      });
    }
  }
  return out;
}
