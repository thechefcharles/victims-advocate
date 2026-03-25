/**
 * Temporary read-only case_access for receiving-org leadership when a referral is pending.
 * Phase 3 may revoke using `referral_review_grant_user_ids` on the referral row metadata.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";

/** MVP: org_owner and supervisor only (not program_manager, not advocates). */
const RECEIVING_LEADER_ROLES = ["org_owner", "supervisor"] as const;

export type ReferralReviewAccessGrantResult = {
  /** All receiving leaders with read path (existing read-only or newly inserted). */
  grantedUserIds: string[];
  /** Subset actually inserted in this call (safe to delete on rollback). */
  insertedUserIds: string[];
};

/**
 * Grant `can_view=true`, `can_edit=false` for users who do not already have edit access.
 */
export async function grantReferralReviewCaseAccessForReceivingLeaders(params: {
  caseId: string;
  /** Case tenant org (`cases.organization_id`) — required on `case_access.organization_id`. */
  caseTenantOrganizationId: string;
  receivingOrganizationId: string;
}): Promise<ReferralReviewAccessGrantResult> {
  const { caseId, caseTenantOrganizationId, receivingOrganizationId } = params;
  const supabase = getSupabaseAdmin();

  const { data: members, error: memErr } = await supabase
    .from("org_memberships")
    .select("user_id, org_role")
    .eq("organization_id", receivingOrganizationId)
    .eq("status", "active")
    .in("org_role", [...RECEIVING_LEADER_ROLES]);

  if (memErr) {
    throw new AppError("INTERNAL", "Failed to load receiving organization leaders", undefined, 500);
  }

  const userIds = [...new Set((members ?? []).map((m: { user_id: string }) => m.user_id))];
  const grantedUserIds: string[] = [];
  const insertedThisRun: string[] = [];

  try {
    for (const userId of userIds) {
      const { data: existing, error: exErr } = await supabase
        .from("case_access")
        .select("can_view, can_edit")
        .eq("case_id", caseId)
        .eq("user_id", userId)
        .maybeSingle();

      if (exErr) {
        throw new AppError("INTERNAL", "Failed to check case access", undefined, 500);
      }

      if (existing?.can_edit === true) {
        continue;
      }
      if (existing?.can_view === true && existing?.can_edit === false) {
        grantedUserIds.push(userId);
        continue;
      }

      const { error: insErr } = await supabase.from("case_access").insert({
        case_id: caseId,
        user_id: userId,
        organization_id: caseTenantOrganizationId,
        role: "advocate",
        can_view: true,
        can_edit: false,
      });

      if (insErr) {
        throw new AppError("INTERNAL", "Failed to grant referral review access", undefined, 500);
      }
      insertedThisRun.push(userId);
      grantedUserIds.push(userId);
    }
  } catch (e) {
    for (const uid of insertedThisRun) {
      await supabase.from("case_access").delete().eq("case_id", caseId).eq("user_id", uid);
    }
    throw e;
  }

  return { grantedUserIds, insertedUserIds: insertedThisRun };
}
