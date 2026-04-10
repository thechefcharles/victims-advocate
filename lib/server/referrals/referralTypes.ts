/**
 * Domain 4.1 — Referrals: first-class domain type definitions.
 *
 * These types describe the new referrals / referral_share_packages / referral_events
 * tables. Distinct from the Phase 1 CaseOrgReferralRow in ./types.ts.
 */

export const REFERRAL_DOMAIN_STATUSES = [
  "draft",
  "pending_acceptance",
  "accepted",
  "rejected",
  "cancelled",
  "closed",
] as const;

export type ReferralDomainStatus = (typeof REFERRAL_DOMAIN_STATUSES)[number];

export const REFERRAL_EVENT_TYPES = [
  "initiated",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "cancelled",
  "closed",
] as const;

export type ReferralEventType = (typeof REFERRAL_EVENT_TYPES)[number];

export type ReferralRow = {
  id: string;
  created_at: string;
  updated_at: string;
  source_organization_id: string;
  target_organization_id: string;
  applicant_id: string;
  initiated_by: string;
  case_id: string | null;
  support_request_id: string | null;
  status: ReferralDomainStatus;
  reason: string | null;
  consent_grant_id: string | null;
  responded_at: string | null;
  responded_by: string | null;
};

export type ReferralSharePackageRow = {
  id: string;
  referral_id: string;
  prepared_by: string;
  prepared_at: string;
  consent_grant_id: string | null;
  package_type: string;
  scoped_data: Record<string, unknown>;
  doc_ids: string[];
};

export type ReferralEventRow = {
  id: string;
  referral_id: string;
  event_type: ReferralEventType;
  actor_id: string;
  occurred_at: string;
  metadata: Record<string, unknown>;
};

export type CreateReferralInput = {
  sourceOrganizationId: string;
  targetOrganizationId: string;
  applicantId: string;
  caseId?: string | null;
  supportRequestId?: string | null;
  reason?: string | null;
};

/** Purpose code used for referral data-sharing consent grants. */
export const REFERRAL_CONSENT_PURPOSE_CODE = "referral_share_basic" as const;
