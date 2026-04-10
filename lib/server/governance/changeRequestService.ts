/**
 * Domain 7.1 — Change request service.
 *
 * Governed changes to system-critical objects. Only targets in
 * GOVERNED_TARGETS are allowed. Lifecycle:
 *   draft → pending_approval → approved | rejected
 *   approved → rolled_back (creates NEW audit event, does NOT delete history)
 *
 * Rollback creates a new change request + audit event — it never deletes
 * the original approval history.
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
  draft: ["pending_approval"],
  pending_approval: ["approved", "rejected"],
  approved: ["rolled_back"],
  rejected: [],
  rolled_back: [],
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

export async function submitChangeRequest(params: {
  id: string;
  actorId: string;
  supabase?: SupabaseClient;
}): Promise<ChangeRequest> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const existing = await getChangeRequestById(params.id, supabase);
  if (!existing) throw new AppError("NOT_FOUND", "Change request not found.", undefined, 404);
  assertTransition(existing.status, "pending_approval");
  return updateChangeRequestStatus(params.id, "pending_approval", supabase);
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
