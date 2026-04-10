import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";

/**
 * Removes in-app `applicant_connection_request_pending` rows for a resolved request
 * (accept/decline) so the applicant no longer sees them.
 */
export async function removeApplicantPendingConnectionNotificationsForRequest(
  victimUserId: string,
  requestId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: rows, error: fetchErr } = await supabase
    .from("notifications")
    .select("id, metadata")
    .eq("user_id", victimUserId)
    .eq("type", "applicant_connection_request_pending");

  if (fetchErr) {
    logger.warn("notifications.removeApplicantPending.fetch_failed", {
      victimUserId,
      requestId,
      message: fetchErr.message,
    });
    return;
  }

  const ids = (rows ?? [])
    .filter((n) => (n.metadata as Record<string, unknown> | null)?.request_id === requestId)
    .map((n) => n.id as string);

  if (ids.length === 0) return;

  const { error: delErr } = await supabase.from("notifications").delete().in("id", ids);
  if (delErr) {
    logger.warn("notifications.removeApplicantPending.delete_failed", {
      victimUserId,
      requestId,
      message: delErr.message,
    });
  }
}
