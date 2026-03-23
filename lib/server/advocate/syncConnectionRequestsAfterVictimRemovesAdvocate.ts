/**
 * After a victim removes an advocate from a case (case_access deleted), align
 * advocate_connection_requests so GET /api/advocate/clients and profile checks
 * do not still show a client relationship with no case access.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";

export async function syncConnectionRequestsAfterVictimRemovesAdvocateFromCase(params: {
  victimUserId: string;
  advocateUserId: string;
  caseId: string;
}): Promise<void> {
  const { victimUserId, advocateUserId, caseId } = params;
  const supabase = getSupabaseAdmin();

  const { data: victimCases, error: casesErr } = await supabase
    .from("cases")
    .select("id")
    .eq("owner_user_id", victimUserId);

  if (casesErr) {
    logger.warn("advocate.syncConnectionRequests.cases_failed", {
      message: casesErr.message,
      victimUserId,
      advocateUserId,
    });
    return;
  }

  const victimCaseIds = (victimCases ?? [])
    .map((r) => r.id as string)
    .filter(Boolean);
  if (victimCaseIds.length === 0) return;

  const { data: remaining, error: remErr } = await supabase
    .from("case_access")
    .select("id")
    .eq("user_id", advocateUserId)
    .eq("role", "advocate")
    .in("case_id", victimCaseIds);

  if (remErr) {
    logger.warn("advocate.syncConnectionRequests.remaining_failed", {
      message: remErr.message,
      victimUserId,
      advocateUserId,
    });
    return;
  }

  const stillConnected = (remaining?.length ?? 0) > 0;

  if (stillConnected) {
    const { error } = await supabase
      .from("advocate_connection_requests")
      .delete()
      .eq("victim_user_id", victimUserId)
      .eq("advocate_user_id", advocateUserId)
      .eq("case_id", caseId);

    if (error) {
      logger.warn("advocate.syncConnectionRequests.delete_case_scoped_failed", {
        message: error.message,
        victimUserId,
        advocateUserId,
        caseId,
      });
    }
    return;
  }

  const { error } = await supabase
    .from("advocate_connection_requests")
    .delete()
    .eq("victim_user_id", victimUserId)
    .eq("advocate_user_id", advocateUserId);

  if (error) {
    logger.warn("advocate.syncConnectionRequests.delete_all_failed", {
      message: error.message,
      victimUserId,
      advocateUserId,
    });
  }
}
