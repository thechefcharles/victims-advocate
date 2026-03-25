/**
 * Case → organization referrals (Phase 1: data model only).
 *
 * Phase 2+ hooks: creation from UI, temporary case_access for reviewers, notifications,
 * timeline entries, and applyCaseOrganizationTransfer on accept.
 */

export const REFERRAL_STATUSES = ["pending", "accepted", "declined"] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

/** Row shape for `public.case_org_referrals` (server / API). */
export type CaseOrgReferralRow = {
  id: string;
  created_at: string;
  updated_at: string;
  case_id: string;
  from_organization_id: string | null;
  to_organization_id: string;
  requested_by_user_id: string;
  status: ReferralStatus;
  responded_at: string | null;
  responded_by_user_id: string | null;
  metadata: Record<string, unknown>;
};

/**
 * Input for creating a referral (caller identity comes from AuthContext).
 * `fromOrganizationId` defaults to the case's `organization_id` when omitted or null.
 */
export type CreateReferralInput = {
  caseId: string;
  toOrganizationId: string;
  fromOrganizationId?: string | null;
  metadata?: Record<string, unknown>;
};

/** Server-only metadata key: user IDs granted temporary read-only case_access (Phase 3 may revoke). */
export const REFERRAL_METADATA_REVIEW_GRANT_USER_IDS = "referral_review_grant_user_ids" as const;
