/**
 * Domain 7.4 — Cron run telemetry helper.
 *
 * Every cron route calls this on success and on error so the admin health
 * dashboard can show last-run status without depending on Vercel logs.
 *
 * Never throws: a logging failure must not cascade into the cron outcome.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function writeCronRun(
  cronName: string,
  status: "success" | "error",
  errorMessage: string | null = null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("cron_run_log").insert({
      cron_name: cronName,
      last_run_at: new Date().toISOString(),
      last_run_status: status,
      error_message: errorMessage,
      metadata,
    });
  } catch {
    /* swallow — never break the cron on a logging failure */
  }
}
