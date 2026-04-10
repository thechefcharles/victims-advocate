/**
 * Domain 6.2 — Agency / Reporting — canonical types.
 *
 * Data class: A — Restricted (agency oversight data, no applicant PII).
 *
 * Agency is an OVERSIGHT account — not a casework account.
 * Key rules:
 *   1. Analytics MUST read from analytics_snapshots — never live-join ops tables
 *   2. All state transitions use POST action endpoints — never PATCH status=x
 *   3. Agency Reviewer CANNOT accept — Officer/Owner only
 *   4. Every state transition emits a trust signal AND writes an audit event
 *   5. No applicant-identifying data in any agency response
 */

import type { AgencyRole } from "@/lib/registry";

// ---------------------------------------------------------------------------
// Re-export for convenience
// ---------------------------------------------------------------------------

export type { AgencyRole };

// ---------------------------------------------------------------------------
// ReportingSubmission status
// ---------------------------------------------------------------------------

export const REPORTING_SUBMISSION_STATUSES = [
  "draft",
  "submitted",
  "revision_requested",
  "accepted",
  "rejected",
] as const;
export type ReportingSubmissionStatus =
  (typeof REPORTING_SUBMISSION_STATUSES)[number];

// ---------------------------------------------------------------------------
// Agency status
// ---------------------------------------------------------------------------

export const AGENCY_STATUSES = ["active", "inactive", "suspended"] as const;
export type AgencyStatus = (typeof AGENCY_STATUSES)[number];

// ---------------------------------------------------------------------------
// Agency membership status
// ---------------------------------------------------------------------------

export const AGENCY_MEMBERSHIP_STATUSES = [
  "active",
  "inactive",
  "removed",
] as const;
export type AgencyMembershipStatus =
  (typeof AGENCY_MEMBERSHIP_STATUSES)[number];

// ---------------------------------------------------------------------------
// Notice type
// ---------------------------------------------------------------------------

export const AGENCY_NOTICE_TYPES = [
  "revision_request",
  "compliance_warning",
  "information_request",
  "commendation",
  "general",
] as const;
export type AgencyNoticeType = (typeof AGENCY_NOTICE_TYPES)[number];

// ---------------------------------------------------------------------------
// Analytics snapshot type
// ---------------------------------------------------------------------------

export const ANALYTICS_SNAPSHOT_TYPES = [
  "provider_overview",
  "submission_status",
  "service_gap",
  "performance_trend",
] as const;
export type AnalyticsSnapshotType = (typeof ANALYTICS_SNAPSHOT_TYPES)[number];

// ---------------------------------------------------------------------------
// DB row interfaces
// ---------------------------------------------------------------------------

export interface AdministeringAgency {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  stateCode: string;
  scopeType: "state" | "regional" | "federal";
  oversightOrgIds: string[];
  oversightProgramIds: string[];
  contactEmail: string | null;
  contactPhone: string | null;
  status: AgencyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyMembership {
  id: string;
  agencyId: string;
  userId: string;
  role: AgencyRole;
  status: AgencyMembershipStatus;
  joinedAt: string;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportingSubmission {
  id: string;
  organizationId: string;
  agencyId: string;
  submittedByUserId: string | null;
  reviewedByUserId: string | null;
  status: ReportingSubmissionStatus;
  title: string;
  description: string | null;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  submissionData: Record<string, unknown>;
  revisionReason: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyNotice {
  id: string;
  agencyId: string;
  targetOrganizationId: string;
  noticeType: AgencyNoticeType;
  subject: string;
  body: string;
  relatedSubmissionId: string | null;
  issuedByUserId: string;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsSnapshot {
  id: string;
  agencyId: string;
  snapshotType: AnalyticsSnapshotType;
  periodStart: string;
  periodEnd: string;
  data: Record<string, unknown>;
  computedAt: string;
  createdAt: string;
}
