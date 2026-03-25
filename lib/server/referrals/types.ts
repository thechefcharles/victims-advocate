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

/** Input for creating a referral (caller identity comes from AuthContext). */
export type CreateReferralInput = {
  caseId: string;
  /** Nullable when the sender has no org context (e.g. victim-only flow). */
  fromOrganizationId: string | null;
  toOrganizationId: string;
  metadata?: Record<string, unknown>;
};
