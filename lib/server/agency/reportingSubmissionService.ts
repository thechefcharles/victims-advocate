/**
 * Domain 6.2 — Reporting submission service.
 *
 * Full lifecycle orchestration with mandatory trust signal emission
 * and audit logging on every state transition.
 *
 * Lifecycle:
 *   draft → submitted → revision_requested | accepted | rejected
 *   revision_requested → submitted (provider resubmits)
 *
 * Every transition MUST:
 *   1. Validate via state machine
 *   2. Persist the status change
 *   3. Emit a trust signal to trust_signal_events
 *   4. Write an audit event to audit_log
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { emitSignal } from "@/lib/server/trustSignal/signalEmitter";
import type { ReportingSubmission } from "./agencyTypes";
import { validateSubmissionTransition } from "./agencyStateMachine";
import {
  getSubmissionById,
  insertSubmission,
  updateSubmissionStatus,
} from "./agencyRepository";

// ---------------------------------------------------------------------------
// Trust signal + audit helpers
// ---------------------------------------------------------------------------

async function emitSubmissionTrustSignal(params: {
  organizationId: string;
  signalType: string;
  submissionId: string;
  supabase: SupabaseClient;
}): Promise<void> {
  await emitSignal(
    {
      orgId: params.organizationId,
      signalType: params.signalType as Parameters<typeof emitSignal>[0]["signalType"],
      value: 1,
      metadata: { submission_id: params.submissionId },
      actorUserId: "system",
      actorAccountType: "agency",
      idempotencyKey: `${params.organizationId}:${params.signalType}:${params.submissionId}`,
    },
    params.supabase,
  ).catch(() => {
    // Non-fatal — signal emission failures should not break the workflow.
  });
}

async function auditSubmissionAction(params: {
  action: string;
  submissionId: string;
  organizationId: string;
  actorUserId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await logEvent({
    ctx: null,
    action: params.action as Parameters<typeof logEvent>[0]["action"],
    resourceType: "reporting_submission",
    resourceId: params.submissionId,
    organizationId: params.organizationId,
    metadata: {
      submission_id: params.submissionId,
      ...params.metadata,
    },
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Create draft
// ---------------------------------------------------------------------------

export interface CreateSubmissionDraftInput {
  organizationId: string;
  agencyId: string;
  submittedByUserId: string;
  title: string;
  description?: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  submissionData?: Record<string, unknown>;
}

export async function createReportingSubmissionDraft(
  input: CreateSubmissionDraftInput,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ReportingSubmission> {
  if (!input.title || input.title.trim().length === 0) {
    throw new AppError("VALIDATION_ERROR", "Title is required.", undefined, 422);
  }
  return insertSubmission(
    {
      organizationId: input.organizationId,
      agencyId: input.agencyId,
      submittedByUserId: input.submittedByUserId,
      status: "draft",
      title: input.title,
      description: input.description ?? null,
      reportingPeriodStart: input.reportingPeriodStart,
      reportingPeriodEnd: input.reportingPeriodEnd,
      submissionData: input.submissionData ?? {},
    },
    supabase,
  );
}

// ---------------------------------------------------------------------------
// Submit (draft → submitted, or revision_requested → submitted)
// ---------------------------------------------------------------------------

export async function submitReportingSubmission(params: {
  submissionId: string;
  submittedByUserId: string;
  supabase?: SupabaseClient;
}): Promise<ReportingSubmission> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const existing = await getSubmissionById(params.submissionId, supabase);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Submission not found.", undefined, 404);
  }
  validateSubmissionTransition(existing.status, "submitted");

  const updated = await updateSubmissionStatus(
    params.submissionId,
    { status: "submitted", submittedByUserId: params.submittedByUserId },
    supabase,
  );

  await emitSubmissionTrustSignal({
    organizationId: existing.organizationId,
    signalType: "reporting_submission_submitted" as string,
    submissionId: params.submissionId,
    supabase,
  });
  await auditSubmissionAction({
    action: "reporting.submission_submitted",
    submissionId: params.submissionId,
    organizationId: existing.organizationId,
    actorUserId: params.submittedByUserId,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Request revision (submitted → revision_requested)
// ---------------------------------------------------------------------------

export async function requestReportingRevision(params: {
  submissionId: string;
  reviewerUserId: string;
  reason: string;
  supabase?: SupabaseClient;
}): Promise<ReportingSubmission> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  if (!params.reason || params.reason.trim().length === 0) {
    throw new AppError("VALIDATION_ERROR", "Revision reason is required.", undefined, 422);
  }
  const existing = await getSubmissionById(params.submissionId, supabase);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Submission not found.", undefined, 404);
  }
  validateSubmissionTransition(existing.status, "revision_requested");

  const updated = await updateSubmissionStatus(
    params.submissionId,
    {
      status: "revision_requested",
      reviewedByUserId: params.reviewerUserId,
      revisionReason: params.reason,
    },
    supabase,
  );

  await emitSubmissionTrustSignal({
    organizationId: existing.organizationId,
    signalType: "reporting_submission_revision_requested" as string,
    submissionId: params.submissionId,
    supabase,
  });
  await auditSubmissionAction({
    action: "reporting.revision_requested",
    submissionId: params.submissionId,
    organizationId: existing.organizationId,
    actorUserId: params.reviewerUserId,
    metadata: { reason: params.reason },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Accept (submitted → accepted)
// ---------------------------------------------------------------------------

export async function acceptReportingSubmission(params: {
  submissionId: string;
  reviewerUserId: string;
  supabase?: SupabaseClient;
}): Promise<ReportingSubmission> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const existing = await getSubmissionById(params.submissionId, supabase);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Submission not found.", undefined, 404);
  }
  validateSubmissionTransition(existing.status, "accepted");

  const updated = await updateSubmissionStatus(
    params.submissionId,
    { status: "accepted", reviewedByUserId: params.reviewerUserId },
    supabase,
  );

  await emitSubmissionTrustSignal({
    organizationId: existing.organizationId,
    signalType: "reporting_submission_accepted" as string,
    submissionId: params.submissionId,
    supabase,
  });
  await auditSubmissionAction({
    action: "reporting.submission_accepted",
    submissionId: params.submissionId,
    organizationId: existing.organizationId,
    actorUserId: params.reviewerUserId,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Reject (submitted → rejected)
// ---------------------------------------------------------------------------

export async function rejectReportingSubmission(params: {
  submissionId: string;
  reviewerUserId: string;
  reason: string;
  supabase?: SupabaseClient;
}): Promise<ReportingSubmission> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  if (!params.reason || params.reason.trim().length === 0) {
    throw new AppError("VALIDATION_ERROR", "Rejection reason is required.", undefined, 422);
  }
  const existing = await getSubmissionById(params.submissionId, supabase);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Submission not found.", undefined, 404);
  }
  validateSubmissionTransition(existing.status, "rejected");

  const updated = await updateSubmissionStatus(
    params.submissionId,
    {
      status: "rejected",
      reviewedByUserId: params.reviewerUserId,
      rejectionReason: params.reason,
    },
    supabase,
  );

  await emitSubmissionTrustSignal({
    organizationId: existing.organizationId,
    signalType: "reporting_submission_rejected" as string,
    submissionId: params.submissionId,
    supabase,
  });
  await auditSubmissionAction({
    action: "reporting.submission_rejected",
    submissionId: params.submissionId,
    organizationId: existing.organizationId,
    actorUserId: params.reviewerUserId,
    metadata: { reason: params.reason },
  });

  return updated;
}
