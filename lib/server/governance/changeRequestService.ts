/**
 * Domain 7.1 — Change request service.
 *
 * Governed changes to system-critical objects. Only targets in
 * GOVERNED_TARGETS are allowed. Canonical 7-state lifecycle from the
 * Master System Document:
 *
 *   draft → submitted → under_review → approved | rejected
 *   approved → rolled_back
 *   draft | submitted | under_review → closed  (withdraw-style terminal)
 *
 * Rollback creates a NEW audit event — it never deletes the original
 * approval history.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type { ChangeRequest, GovernedTarget } from "./governanceTypes";
import { GOVERNED_TARGETS } from "./governanceTypes";
import {
  getChangeRequestById,
  insertApprovalDecision,
  insertChangeRequest,
  updateChangeRequestStatus,
} from "./governanceRepository";
import { logAuditEvent } from "./auditService";

function assertGovernedTarget(targetType: string): asserts targetType is GovernedTarget {
  if (!GOVERNED_TARGETS.includes(targetType as GovernedTarget)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `'${targetType}' is not a governed target. Allowed: ${GOVERNED_TARGETS.join(", ")}.`,
      undefined,
      422,
    );
  }
}

const CHANGE_REQUEST_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted", "closed"],
  submitted: ["under_review", "closed"],
  under_review: ["approved", "rejected", "closed"],
  approved: ["rolled_back"],
  rejected: [],
  rolled_back: [],
  closed: [],
};

function assertTransition(from: string, to: string): void {
  const allowed = CHANGE_REQUEST_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Cannot transition change request from '${from}' to '${to}'.`,
      undefined,
      422,
    );
  }
}

export async function createChangeRequest(params: {
  targetType: string;
  targetId: string;
  requestedChange: Record<string, unknown>;
  reason: string;
  requestedByUserId: string;
  supabase?: SupabaseClient;
}): Promise<ChangeRequest> {
  assertGovernedTarget(params.targetType);
  const supabase = params.supabase ?? getSupabaseAdmin();
  const cr = await insertChangeRequest(
    {
      targetType: params.targetType,
      targetId: params.targetId,
      requestedChange: params.requestedChange,
      reason: params.reason,
      status: "draft",
      requestedByUserId: params.requestedByUserId,
    },
    supabase,
  );
  void logAuditEvent({
    actorId: params.requestedByUserId,
    action: "change_request:create",
    resourceType: "change_request",
    resourceId: cr.id,
    eventCategory: "governance_change",
    metadata: { target_type: params.targetType, target_id: params.targetId },
  });
  return cr;
}

/**
 * Transition: draft → submitted.
 */
export async function submitChangeRequest(params: {
  id: string;
  actorId: string;
  supabase?: SupabaseClient;
}): Promise<ChangeRequest> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const existing = await getChangeRequestById(params.id, supabase);
  if (!existing) throw new AppError("NOT_FOUND", "Change request not found.", undefined, 404);
  assertTransition(existing.status, "submitted");
  const updated = await updateChangeRequestStatus(params.id, "submitted", supabase);
  void logAuditEvent({
    actorId: params.actorId,
    action: "change_request:submit",
    resourceType: "change_request",
    resourceId: params.id,
    eventCategory: "governance_change",
    metadata: { target_type: existing.targetType, target_id: existing.targetId },
  });
  return updated;
}

/**
 * Transition: submitted → under_review. Marks a change request as actively
 * being reviewed by an admin. Approvals/rejections must come from here.
 */
export async function startChangeRequestReview(params: {
  id: string;
  reviewerUserId: string;
  supabase?: SupabaseClient;
}): Promise<ChangeRequest> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const existing = await getChangeRequestById(params.id, supabase);
  if (!existing) throw new AppError("NOT_FOUND", "Change request not found.", undefined, 404);
  assertTransition(existing.status, "under_review");
  const updated = await updateChangeRequestStatus(params.id, "under_review", supabase);
  void logAuditEvent({
    actorId: params.reviewerUserId,
    action: "change_request:review_start",
    resourceType: "change_request",
    resourceId: params.id,
    eventCategory: "governance_change",
    metadata: { target_type: existing.targetType, target_id: existing.targetId },
  });
  return updated;
}

/**
 * Transition: draft | submitted | under_review → closed.
 * Withdraw-style finalizer for change requests that are abandoned before
 * resolution. Approved / rejected / rolled_back are already terminal and
 * cannot close through this path.
 */
export async function closeChangeRequest(params: {
  id: string;
  actorId: string;
  reason?: string;
  supabase?: SupabaseClient;
}): Promise<ChangeRequest> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const existing = await getChangeRequestById(params.id, supabase);
  if (!existing) throw new AppError("NOT_FOUND", "Change request not found.", undefined, 404);
  assertTransition(existing.status, "closed");
  const updated = await updateChangeRequestStatus(params.id, "closed", supabase);
  void logAuditEvent({
    actorId: params.actorId,
    action: "change_request:close",
    resourceType: "change_request",
    resourceId: params.id,
    eventCategory: "governance_change",
    metadata: {
      target_type: existing.targetType,
      target_id: existing.targetId,
      reason: params.reason ?? "no reason provided",
      from_state: existing.status,
    },
  });
  return updated;
}

export async function approveChangeRequest(params: {
  id: string;
  decidedByUserId: string;
  reason?: string;
  supabase?: SupabaseClient;
}): Promise<ChangeRequest> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const existing = await getChangeRequestById(params.id, supabase);
  if (!existing) throw new AppError("NOT_FOUND", "Change request not found.", undefined, 404);
  assertTransition(existing.status, "approved");

  await insertApprovalDecision(
    {
      changeRequestId: params.id,
      decision: "approved",
      decidedByUserId: params.decidedByUserId,
      reason: params.reason ?? null,
    },
    supabase,
  );
  const updated = await updateChangeRequestStatus(params.id, "approved", supabase);

  void logAuditEvent({
    actorId: params.decidedByUserId,
    action: "change_request:approve",
    resourceType: "change_request",
    resourceId: params.id,
    eventCategory: "governance_change",
    metadata: { target_type: existing.targetType, target_id: existing.targetId },
  });

  return updated;
}

export async function rejectChangeRequest(params: {
  id: string;
  decidedByUserId: string;
  reason?: string;
  supabase?: SupabaseClient;
}): Promise<ChangeRequest> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const existing = await getChangeRequestById(params.id, supabase);
  if (!existing) throw new AppError("NOT_FOUND", "Change request not found.", undefined, 404);
  assertTransition(existing.status, "rejected");

  await insertApprovalDecision(
    {
      changeRequestId: params.id,
      decision: "rejected",
      decidedByUserId: params.decidedByUserId,
      reason: params.reason ?? null,
    },
    supabase,
  );
  const updated = await updateChangeRequestStatus(params.id, "rejected", supabase);

  void logAuditEvent({
    actorId: params.decidedByUserId,
    action: "change_request:reject",
    resourceType: "change_request",
    resourceId: params.id,
    eventCategory: "governance_change",
  });

  return updated;
}

export async function rollbackChangeRequest(params: {
  id: string;
  actorId: string;
  reason?: string;
  supabase?: SupabaseClient;
}): Promise<ChangeRequest> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const existing = await getChangeRequestById(params.id, supabase);
  if (!existing) throw new AppError("NOT_FOUND", "Change request not found.", undefined, 404);
  assertTransition(existing.status, "rolled_back");

  // Rollback creates a NEW audit event — does NOT delete history.
  const updated = await updateChangeRequestStatus(params.id, "rolled_back", supabase);

  void logAuditEvent({
    actorId: params.actorId,
    action: "change_request:rollback",
    resourceType: "change_request",
    resourceId: params.id,
    eventCategory: "governance_change",
    metadata: {
      target_type: existing.targetType,
      target_id: existing.targetId,
      reason: params.reason ?? "no reason provided",
    },
  });

  return updated;
}
