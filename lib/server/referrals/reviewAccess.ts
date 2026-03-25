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

/**
 * After an accepted referral + org transfer: remove read-only rows inserted for referral review,
 * except optionally one user (typically the leader who accepted).
 *
 * Rationale (Phase 5): bulk transfer rewrites `case_access.organization_id` for everyone, which
 * would leave all receiving leaders with indefinite read-only “review” semantics. We drop those
 * temporary rows so access is explicit (invites / normal org workflows); the accepter keeps
 * read-only continuity to open the case until edit access is granted separately.
 */
export async function revokeReferralInsertedReviewAccessAfterAccept(params: {
  caseId: string;
  /** `cases.organization_id` after transfer (receiving org). */
  postTransferOrganizationId: string;
  insertedUserIds: string[];
  /** If set, this user's matching read-only row is not removed. */
  keepUserId: string | null;
}): Promise<void> {
  const { caseId, postTransferOrganizationId, insertedUserIds, keepUserId } = params;
  if (insertedUserIds.length === 0) return;

  const supabase = getSupabaseAdmin();

  for (const userId of insertedUserIds) {
    if (keepUserId && userId === keepUserId) continue;

    const { data: row, error: selErr } = await supabase
      .from("case_access")
      .select("can_view, can_edit, organization_id, role")
      .eq("case_id", caseId)
      .eq("user_id", userId)
      .maybeSingle();

    if (selErr) {
      throw new AppError("INTERNAL", "Failed to load case access for post-accept cleanup", undefined, 500);
    }
    if (!row) continue;
    if (row.can_edit === true) continue;
    if (row.organization_id !== postTransferOrganizationId) continue;
    if (row.role !== "advocate") continue;

    const { error: delErr } = await supabase
      .from("case_access")
      .delete()
      .eq("case_id", caseId)
      .eq("user_id", userId);

    if (delErr) {
      throw new AppError("INTERNAL", "Failed to clean up referral review access after accept", undefined, 500);
    }
  }
}

/**
 * Remove temporary review `case_access` created for this referral (inserted recipients only).
 * Skips rows that are now edit-capable or belong to a different case tenant org.
 * Phase 4: case transfer will replace broader access patterns.
 */
export async function revokeReferralReviewCaseAccessForInsertedRecipients(params: {
  caseId: string;
  caseTenantOrganizationId: string;
  insertedUserIds: string[];
}): Promise<void> {
  const { caseId, caseTenantOrganizationId, insertedUserIds } = params;
  if (insertedUserIds.length === 0) return;

  const supabase = getSupabaseAdmin();

  for (const userId of insertedUserIds) {
    const { data: row, error: selErr } = await supabase
      .from("case_access")
      .select("can_view, can_edit, organization_id, role")
      .eq("case_id", caseId)
      .eq("user_id", userId)
      .maybeSingle();

    if (selErr) {
      throw new AppError("INTERNAL", "Failed to load case access for revoke", undefined, 500);
    }
    if (!row) continue;
    if (row.can_edit === true) continue;
    if (row.organization_id !== caseTenantOrganizationId) continue;
    if (row.role !== "advocate") continue;

    const { error: delErr } = await supabase
      .from("case_access")
      .delete()
      .eq("case_id", caseId)
      .eq("user_id", userId);

    if (delErr) {
      throw new AppError("INTERNAL", "Failed to revoke referral review access", undefined, 500);
    }
  }
}
