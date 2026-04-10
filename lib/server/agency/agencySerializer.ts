/**
 * Domain 6.2 — Agency serializers.
 *
 * Four completely separate output shapes:
 *   serializeSubmissionForProvider — own-org reporting workflow view
 *   serializeSubmissionForAgency  — aggregate/comparative, scope-safe
 *   serializeAgencyOverview       — dashboard summary from analytics_snapshots
 *   serializeSubmissionForAdmin   — full metadata + audit
 *
 * **Hard rule**: No applicant-level operational detail in ANY agency response.
 * No case IDs, no intake data, no document content, no message threads.
 */

import type {
  AgencyNotice,
  AnalyticsSnapshot,
  ReportingSubmission,
} from "./agencyTypes";

// ---------------------------------------------------------------------------
// Provider submission view — own org status + revision context
// ---------------------------------------------------------------------------

export interface ProviderSubmissionView {
  id: string;
  status: string;
  title: string;
  description: string | null;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  submittedAt: string | null;
  revisionReason: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export function serializeSubmissionForProvider(
  sub: ReportingSubmission,
): ProviderSubmissionView {
  return {
    id: sub.id,
    status: sub.status,
    title: sub.title,
    description: sub.description,
    reportingPeriodStart: sub.reportingPeriodStart,
    reportingPeriodEnd: sub.reportingPeriodEnd,
    submittedAt: sub.submittedAt,
    revisionReason: sub.revisionReason,
    rejectionReason: sub.rejectionReason,
    createdAt: sub.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Agency submission view — aggregate + review cues, no applicant detail
// ---------------------------------------------------------------------------

export interface AgencySubmissionView {
  id: string;
  organizationId: string;
  status: string;
  title: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  revisionReason: string | null;
}

export function serializeSubmissionForAgency(
  sub: ReportingSubmission,
): AgencySubmissionView {
  return {
    id: sub.id,
    organizationId: sub.organizationId,
    status: sub.status,
    title: sub.title,
    reportingPeriodStart: sub.reportingPeriodStart,
    reportingPeriodEnd: sub.reportingPeriodEnd,
    submittedAt: sub.submittedAt,
    reviewedAt: sub.reviewedAt,
    revisionReason: sub.revisionReason,
  };
}

// ---------------------------------------------------------------------------
// Agency overview — dashboard from analytics_snapshots
// ---------------------------------------------------------------------------

export interface AgencyOverviewView {
  agencyId: string;
  providerCount: number;
  submissionStatusCounts: Record<string, number>;
  tierDistribution: Record<string, number>;
}

export function serializeAgencyOverview(params: {
  agencyId: string;
  providerCount: number;
  submissionStatusCounts: Record<string, number>;
  tierDistribution: Record<string, number>;
}): AgencyOverviewView {
  return {
    agencyId: params.agencyId,
    providerCount: params.providerCount,
    submissionStatusCounts: params.submissionStatusCounts,
    tierDistribution: params.tierDistribution,
  };
}

// ---------------------------------------------------------------------------
// Admin view — full metadata
// ---------------------------------------------------------------------------

export function serializeSubmissionForAdmin(
  sub: ReportingSubmission,
): ReportingSubmission {
  return sub;
}

export function serializeNoticeForAdmin(
  notice: AgencyNotice,
): AgencyNotice {
  return notice;
}

export function serializeAnalyticsForAdmin(
  snapshot: AnalyticsSnapshot,
): AnalyticsSnapshot {
  return snapshot;
}
