/**
 * Domain 1.2 — Case: service layer.
 *
 * All business logic for the Case domain (except assignment — see caseAssignmentService.ts).
 * Every mutating function follows the pipeline:
 *   1. Fetch current record
 *   2. Call can() → deny if not allowed
 *   3. (For status changes) call transition() → throw if STATE_INVALID
 *   4. Call repository update with expectedFromStatus (optimistic concurrency)
 *   5. Return serialized result appropriate to caller's account type
 *
 * Rule 16 — Transition Law: no .update({ status }) without transition() success.
 * Rule 17 — Policy Law: all auth through can(), no inline role checks.
 *
 * Data class: Class A — Restricted.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { transition } from "@/lib/server/workflow/engine";
import { emitSignal } from "@/lib/server/trustSignal";
import { linkSupportRequestToCase } from "@/lib/server/supportRequests/supportRequestRepository";
import type { AuthContext } from "@/lib/server/auth/context";
import type { PolicyResource } from "@/lib/server/policy/policyTypes";
import {
  getCaseRecordById,
  listCasesByOwner,
  listCasesByOrganization,
  createCaseRecord,
  updateCaseRecord,
} from "./caseRepository";
import {
  serializeCaseForApplicant,
  serializeCaseForProvider,
  serializeCaseForAdmin,
} from "./caseSerializer";
import type {
  CaseRecord,
  CaseApplicantView,
  CaseProviderView,
  CaseAdminView,
  CreateCaseFromSupportRequestInput,
  UpdateCaseFieldsInput,
  RecordOutcomeInput,
} from "./caseTypes";
import type { CaseStatus } from "@/lib/registry";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toResource(record: CaseRecord): PolicyResource {
  return {
    type: "case",
    id: record.id,
    ownerId: record.owner_user_id,
    tenantId: record.organization_id ?? undefined,
    assignedTo: record.assigned_advocate_id ?? undefined,
    status: record.status,
  };
}

function serializeForActor(
  record: CaseRecord,
  ctx: AuthContext,
): CaseApplicantView | CaseProviderView | CaseAdminView {
  if (ctx.isAdmin) return serializeCaseForAdmin(record);
  if (ctx.accountType === "provider") return serializeCaseForProvider(record);
  return serializeCaseForApplicant(record);
}

function denyForbidden(reason?: string): never {
  throw new AppError("FORBIDDEN", reason ?? "Access denied.");
}

// ---------------------------------------------------------------------------
// Create from support request
// ---------------------------------------------------------------------------

/**
 * Creates a new Case from an accepted SupportRequest.
 * Links the support request back via support_requests.case_id.
 * Emits case_response_time trust signal.
 */
export async function createCaseFromSupportRequest(
  ctx: AuthContext,
  input: CreateCaseFromSupportRequestInput,
  supabase: SupabaseClient,
): Promise<CaseProviderView> {
  const actor = buildActor(ctx);

  const resource: PolicyResource = {
    type: "case",
    id: null,
    ownerId: null,
    tenantId: input.organization_id,
  };
  const decision = await can("case:create_from_support_request", actor, resource);
  if (!decision.allowed) denyForbidden(decision.message);

  const record = await createCaseRecord(supabase, {
    owner_user_id: ctx.userId,
    organization_id: input.organization_id,
    program_id: input.program_id ?? null,
    support_request_id: input.support_request_id,
  });

  // Link support request → case
  await linkSupportRequestToCase(supabase, input.support_request_id, record.id);

  // Emit trust signal (fire-and-forget)
  void emitSignal(
    {
      orgId: input.organization_id,
      signalType: "case_response_time",
      value: 0,
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      idempotencyKey: `${input.organization_id}:case_response_time:${record.id}`,
      metadata: { case_id: record.id, support_request_id: input.support_request_id },
    },
    supabase,
  );

  return serializeCaseForProvider(record);
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Returns a single case, serialized for the caller's account type. */
export async function getCase(
  ctx: AuthContext,
  caseId: string,
  supabase: SupabaseClient,
): Promise<CaseApplicantView | CaseProviderView | CaseAdminView> {
  const record = await getCaseRecordById(supabase, caseId);
  if (!record) throw new AppError("NOT_FOUND", "Case not found.");

  const actor = buildActor(ctx);
  const decision = await can("case:read", actor, toResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  return serializeForActor(record, ctx);
}

/** Returns the list of cases for the authenticated actor. */
export async function listCases(
  ctx: AuthContext,
  filters: { status?: CaseStatus },
  supabase: SupabaseClient,
): Promise<Array<CaseApplicantView | CaseProviderView | CaseAdminView>> {
  if (ctx.accountType === "applicant") {
    const records = await listCasesByOwner(supabase, ctx.userId, filters);
    return records.map((r) => serializeCaseForApplicant(r));
  }

  if (ctx.accountType === "provider" && ctx.orgId) {
    const records = await listCasesByOrganization(supabase, ctx.orgId, filters);
    return records.map((r) => serializeCaseForProvider(r));
  }

  if (ctx.isAdmin && ctx.orgId) {
    const records = await listCasesByOrganization(supabase, ctx.orgId, filters);
    return records.map((r) => serializeCaseForAdmin(r));
  }

  return [];
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

/**
 * Transitions a case to in_progress from assigned.
 */
export async function startCaseProgress(
  ctx: AuthContext,
  caseId: string,
  supabase: SupabaseClient,
): Promise<CaseProviderView> {
  return _transitionCase(ctx, caseId, "in_progress", "case:update_status", supabase);
}

/**
 * Transitions a case to awaiting_applicant.
 */
export async function pauseCaseForApplicant(
  ctx: AuthContext,
  caseId: string,
  supabase: SupabaseClient,
): Promise<CaseProviderView> {
  return _transitionCase(ctx, caseId, "awaiting_applicant", "case:update_status", supabase);
}

/**
 * Marks a case ready for submission (ready_for_submission).
 */
export async function markCaseReady(
  ctx: AuthContext,
  caseId: string,
  supabase: SupabaseClient,
): Promise<CaseProviderView> {
  return _transitionCase(ctx, caseId, "ready_for_submission", "case:mark_ready", supabase);
}

/**
 * Submits a case (ready_for_submission → submitted).
 */
export async function submitCase(
  ctx: AuthContext,
  caseId: string,
  supabase: SupabaseClient,
): Promise<CaseProviderView> {
  return _transitionCase(ctx, caseId, "submitted", "case:submit", supabase, {
    submitted_at: new Date().toISOString(),
  });
}

/**
 * Records the outcome (under_review → approved | denied).
 */
export async function recordCaseOutcome(
  ctx: AuthContext,
  caseId: string,
  input: RecordOutcomeInput,
  supabase: SupabaseClient,
): Promise<CaseProviderView> {
  return _transitionCase(
    ctx,
    caseId,
    input.outcome,
    "case:record_outcome",
    supabase,
    { outcome_recorded_at: new Date().toISOString() },
  );
}

/**
 * Starts an appeal on a denied case (denied → appeal_in_progress).
 */
export async function startCaseAppeal(
  ctx: AuthContext,
  caseId: string,
  supabase: SupabaseClient,
): Promise<CaseApplicantView> {
  const record = await getCaseRecordById(supabase, caseId);
  if (!record) throw new AppError("NOT_FOUND", "Case not found.");

  const actor = buildActor(ctx);
  const decision = await can("case:appeal_start", actor, toResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const result = await transition(
    {
      entityType: "case_status",
      entityId: caseId,
      fromState: record.status,
      toState: "appeal_in_progress",
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      tenantId: record.organization_id ?? undefined,
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError("FORBIDDEN", `Transition failed: ${result.reason}`, {
      reason: result.reason,
    });
  }

  const updated = await updateCaseRecord(
    supabase,
    caseId,
    { status: "appeal_in_progress" },
    record.status,
  );
  if (!updated) throw new AppError("FORBIDDEN", "Case was modified by another action.");

  return serializeCaseForApplicant(updated);
}

/**
 * Closes a case (approved | denied | appeal_in_progress → closed).
 * Emits case_time_to_resolution trust signal.
 */
export async function closeCase(
  ctx: AuthContext,
  caseId: string,
  supabase: SupabaseClient,
): Promise<CaseProviderView> {
  const record = await getCaseRecordById(supabase, caseId);
  if (!record) throw new AppError("NOT_FOUND", "Case not found.");

  const actor = buildActor(ctx);
  const decision = await can("case:close", actor, toResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const result = await transition(
    {
      entityType: "case_status",
      entityId: caseId,
      fromState: record.status,
      toState: "closed",
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      tenantId: record.organization_id ?? undefined,
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError("FORBIDDEN", `Transition failed: ${result.reason}`, {
      reason: result.reason,
    });
  }

  const now = new Date().toISOString();
  const updated = await updateCaseRecord(
    supabase,
    caseId,
    { status: "closed", closed_at: now },
    record.status,
  );
  if (!updated) throw new AppError("FORBIDDEN", "Case was modified by another action.");

  // Emit resolution signal (fire-and-forget)
  if (record.organization_id) {
    const openedAt = new Date(record.created_at).getTime();
    const closedAtMs = new Date(now).getTime();
    const hoursToResolution = (closedAtMs - openedAt) / (1000 * 60 * 60);
    void emitSignal(
      {
        orgId: record.organization_id,
        signalType: "case_time_to_resolution",
        value: hoursToResolution,
        actorUserId: ctx.userId,
        actorAccountType: ctx.accountType,
        idempotencyKey: `${record.organization_id}:case_time_to_resolution:${caseId}`,
        metadata: { case_id: caseId },
      },
      supabase,
    );
  }

  return serializeCaseForProvider(updated);
}

// ---------------------------------------------------------------------------
// Internal transition helper
// ---------------------------------------------------------------------------

async function _transitionCase(
  ctx: AuthContext,
  caseId: string,
  toState: CaseStatus,
  policyAction: import("@/lib/server/policy/actionRegistry").PolicyAction,
  supabase: SupabaseClient,
  extraFields?: Partial<Omit<CaseRecord, "id" | "created_at" | "owner_user_id">>,
): Promise<CaseProviderView> {
  const record = await getCaseRecordById(supabase, caseId);
  if (!record) throw new AppError("NOT_FOUND", "Case not found.");

  const actor = buildActor(ctx);
  const decision = await can(policyAction, actor, toResource(record));
  if (!decision.allowed) denyForbidden(decision.message);

  const result = await transition(
    {
      entityType: "case_status",
      entityId: caseId,
      fromState: record.status,
      toState,
      actorUserId: ctx.userId,
      actorAccountType: ctx.accountType,
      tenantId: record.organization_id ?? undefined,
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError("FORBIDDEN", `Transition failed: ${result.reason}`, {
      reason: result.reason,
    });
  }

  const updated = await updateCaseRecord(
    supabase,
    caseId,
    { status: toState, ...extraFields },
    record.status,
  );
  if (!updated) throw new AppError("FORBIDDEN", "Case was modified by another action.");

  return serializeCaseForProvider(updated);
}
