/**
 * Domain 4.1 — Referral serializers.
 *
 * Four serializer shapes per spec:
 *   serializeForSourceOrg  — sending org: full control fields, share package summary
 *   serializeForTargetOrg  — receiving org: scoped data only, NO source-internal fields
 *   serializeForApplicant  — applicant-safe: status + outcome only, no provider reasoning
 *   serializeForAdmin      — full row with audit context
 */

import type { ReferralRow, ReferralSharePackageRow } from "./referralTypes";

export type SourceOrgReferralView = {
  id: string;
  status: string;
  target_organization_id: string;
  applicant_id: string;
  reason: string | null;
  case_id: string | null;
  support_request_id: string | null;
  consent_grant_id: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  share_package_summary: { prepared: boolean; doc_count: number } | null;
};

export type TargetOrgReferralView = {
  id: string;
  status: string;
  source_organization_id: string;
  applicant_id: string;
  case_id: string | null;
  created_at: string;
  responded_at: string | null;
  share_package: {
    scoped_data: Record<string, unknown>;
    doc_ids: string[];
  } | null;
};

export type ApplicantReferralView = {
  id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
};

export type AdminReferralView = ReferralRow;

export function serializeForSourceOrg(
  row: ReferralRow,
  sharePackage?: ReferralSharePackageRow | null,
): SourceOrgReferralView {
  return {
    id: row.id,
    status: row.status,
    target_organization_id: row.target_organization_id,
    applicant_id: row.applicant_id,
    reason: row.reason,
    case_id: row.case_id,
    support_request_id: row.support_request_id,
    consent_grant_id: row.consent_grant_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    responded_at: row.responded_at,
    share_package_summary: sharePackage
      ? { prepared: true, doc_count: (sharePackage.doc_ids ?? []).length }
      : null,
  };
}

export function serializeForTargetOrg(
  row: ReferralRow,
  sharePackage?: ReferralSharePackageRow | null,
): TargetOrgReferralView {
  return {
    id: row.id,
    status: row.status,
    source_organization_id: row.source_organization_id,
    applicant_id: row.applicant_id,
    case_id: row.case_id,
    created_at: row.created_at,
    responded_at: row.responded_at,
    share_package: sharePackage
      ? { scoped_data: sharePackage.scoped_data, doc_ids: sharePackage.doc_ids }
      : null,
    // Explicitly excluded: reason (source-internal), initiated_by, consent_grant_id,
    // support_request_id, responded_by, updated_at
  };
}

export function serializeForApplicant(row: ReferralRow): ApplicantReferralView {
  return {
    id: row.id,
    status: row.status,
    created_at: row.created_at,
    responded_at: row.responded_at,
    // Explicitly excluded: all provider-internal fields (reason, org IDs,
    // consent_grant_id, initiated_by, responded_by)
  };
}

export function serializeForAdmin(row: ReferralRow): AdminReferralView {
  return row;
}
