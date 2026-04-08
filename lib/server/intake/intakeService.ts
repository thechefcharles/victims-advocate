/**
 * Domain 2.1 — Intake: service layer.
 *
 * Central orchestration. Every mutating function follows the pipeline:
 *   1. Fetch current record (where applicable)
 *   2. Call can() → deny on failure
 *   3. Validate (business rules / state gate)
 *   4. Execute repository write
 *   5. Emit trust signal (gated on org_id) and write audit log
 *   6. Return serialized result
 *
 * Rule 16 — Transition Law: status changes on linked Case go through transition().
 * Rule 17 — Policy Law: all auth through can(), no inline role checks.
 * Search Law (Rule 12): no organizations table queries here.
 *
 * Data class: Class A — Restricted.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { transition } from "@/lib/server/workflow/engine";
import { emitSignal } from "@/lib/server/trustSignal";
import { logEvent } from "@/lib/server/audit/logEvent";
import { getCaseRecordById } from "@/lib/server/cases/caseRepository";
import type { AuthContext } from "@/lib/server/auth/context";
import type { PolicyResource } from "@/lib/server/policy/policyTypes";
import type { CaseStatus } from "@/lib/registry";
import {
  getSessionById,
  insertSession,
  updateDraftPayload,
  updateSessionStatus,
  insertSubmission,
  getSubmissionById,
  getSubmissionBySessionId,
  insertAmendment,
  listAmendmentsBySubmission,
} from "./intakeRepository";
import { validateSubmissionReadiness, validateIntakeStep } from "./intakeValidation";
import { buildSearchAttributesFromIntake } from "./buildSearchAttributesFromIntake";
import { serializeForApplicant, serializeForProvider } from "./intakeSerializer";
import type {
  IntakeSessionRecord,
  IntakeSubmissionRecord,
  IntakeApplicantView,
  IntakeProviderView,
  CreateIntakeSessionInput,
  SaveIntakeDraftInput,
  AmendIntakeSubmissionInput,
  ApplicantSearchProfile,
} from "./intakeTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sessionToResource(record: IntakeSessionRecord): PolicyResource {
  return {
    type: "intake_session",
    id: record.id,
    ownerId: record.owner_user_id,
    tenantId: record.organization_id ?? undefined,
    status: record.status,
    // assignedTo will be the case's assigned advocate when the case is fetched
    // — populated by callers that have already loaded the case.
  };
}

function submissionToResource(
  record: IntakeSubmissionRecord,
  assignedAdvocateId?: string | null,
): PolicyResource {
  return {
    type: "intake_submission",
    id: record.id,
    ownerId: record.owner_user_id,
    tenantId: record.organization_id ?? undefined,
    assignedTo: assignedAdvocateId ?? undefined,
  };
}

function denyForbidden(reason?: string): never {
  throw new AppError("FORBIDDEN", reason ?? "Access denied.");
}

// ---------------------------------------------------------------------------
// startIntake
// ---------------------------------------------------------------------------

export async function startIntake(
  ctx: AuthContext,
  input: CreateIntakeSessionInput,
  supabase: SupabaseClient,
): Promise<IntakeApplicantView> {
  const actor = buildActor(ctx);

  const decision = await can("intake:start", actor, {
    type: "intake_session",
    id: null,
    ownerId: ctx.userId,
    tenantId: input.organization_id ?? undefined,
  });
  if (!decision.allowed) denyForbidden(decision.message);

  const session = await insertSession(supabase, {
    owner_user_id: ctx.userId,
    state_code: input.state_code,
    case_id: input.case_id ?? null,
    support_request_id: input.support_request_id ?? null,
    organization_id: input.organization_id ?? null,
  });

  // Trust signal — only emit when an org is already linked (Decision 9).
  if (session.organization_id) {
    void emitSignal(
      {
        orgId: session.organization_id,
        signalType: "intake_started",
        value: 1,
        actorUserId: ctx.userId,
        actorAccountType: ctx.accountType,
        idempotencyKey: `intake_started:${session.id}`,
        metadata: { session_id: session.id, case_id: session.case_id },
      },
      supabase,
    );
  }

  void logEvent({
    ctx,
    action: "case.intake_started",
    resourceType: "intake_session",
    resourceId: session.id,
    organizationId: session.organization_id,
    metadata: { state_code: session.state_code, case_id: session.case_id },
  });

  return serializeForApplicant(session);
}

// ---------------------------------------------------------------------------
// saveIntakeDraft
// ---------------------------------------------------------------------------

export async function saveIntakeDraft(
  ctx: AuthContext,
  sessionId: string,
  patch: SaveIntakeDraftInput,
  supabase: SupabaseClient,
): Promise<IntakeApplicantView> {
  const session = await getSessionById(supabase, sessionId);
  if (!session) throw new AppError("NOT_FOUND", "Intake session not found.");

  if (session.status !== "draft") {
    throw new AppError("FORBIDDEN", "This intake session is no longer editable.");
  }

  const actor = buildActor(ctx);
  const decision = await can("intake:save_draft", actor, sessionToResource(session));
  if (!decision.allowed) denyForbidden(decision.message);

  // Dual-write: also update legacy cases.application if a case is linked
  // (Decision 2 — keeps the legacy intake page in sync until it is rewritten).
  const caseApplicationPatch = session.case_id
    ? { caseId: session.case_id, payload: patch.draftPayload }
    : undefined;

  const updated = await updateDraftPayload(
    supabase,
    sessionId,
    patch.draftPayload,
    caseApplicationPatch,
  );

  return serializeForApplicant(updated);
}

// ---------------------------------------------------------------------------
// submitIntake — two-phase: snapshot + state transition
// ---------------------------------------------------------------------------

export async function submitIntake(
  ctx: AuthContext,
  sessionId: string,
  supabase: SupabaseClient,
): Promise<IntakeApplicantView> {
  const session = await getSessionById(supabase, sessionId);
  if (!session) throw new AppError("NOT_FOUND", "Intake session not found.");

  if (session.status !== "draft") {
    throw new AppError("FORBIDDEN", "This intake session has already been submitted.");
  }

  const actor = buildActor(ctx);
  const decision = await can("intake:submit", actor, sessionToResource(session));
  if (!decision.allowed) denyForbidden(decision.message);

  const readiness = validateSubmissionReadiness(session);
  if (!readiness.ready) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Intake is not ready for submission. Missing steps: ${readiness.missingSteps.join(", ")}`,
      { missingSteps: readiness.missingSteps },
    );
  }

  // ---------- PHASE A: snapshot + status update -----------------------------
  const submission = await insertSubmission(supabase, {
    session_id: session.id,
    case_id: session.case_id,
    organization_id: session.organization_id,
    owner_user_id: session.owner_user_id,
    submitted_payload: session.draft_payload,
    intake_schema_version: session.intake_schema_version,
    state_code: session.state_code,
    submitted_by_user_id: ctx.userId,
  });

  const submittedSession = await updateSessionStatus(supabase, session.id, "submitted");

  // Build typed search profile for downstream consumers (matching/search).
  // This is intentionally a side-effect-free call — the result is currently
  // unused at the persistence layer; matching reads it via the public mapper.
  const searchProfile: ApplicantSearchProfile = buildSearchAttributesFromIntake(submission);
  void searchProfile;

  if (session.organization_id) {
    void emitSignal(
      {
        orgId: session.organization_id,
        signalType: "intake_completed",
        value: 1,
        actorUserId: ctx.userId,
        actorAccountType: ctx.accountType,
        idempotencyKey: `intake_completed:${submission.id}`,
        metadata: { session_id: session.id, submission_id: submission.id },
      },
      supabase,
    );

    const startedAt = new Date(session.created_at).getTime();
    const submittedAtMs = new Date(submission.submitted_at).getTime();
    const minutesToComplete = Math.max(0, (submittedAtMs - startedAt) / (1000 * 60));
    void emitSignal(
      {
        orgId: session.organization_id,
        signalType: "intake_time_to_complete",
        value: minutesToComplete,
        actorUserId: ctx.userId,
        actorAccountType: ctx.accountType,
        idempotencyKey: `intake_time_to_complete:${submission.id}`,
        metadata: { session_id: session.id, submission_id: submission.id },
      },
      supabase,
    );
  }

  void logEvent({
    ctx,
    action: "case.intake_completed",
    resourceType: "intake_submission",
    resourceId: submission.id,
    organizationId: submission.organization_id,
    metadata: {
      session_id: session.id,
      case_id: session.case_id,
      state_code: session.state_code,
    },
  });

  // ---------- PHASE B: case state transition (best-effort, Decision 5) ------
  if (session.case_id) {
    try {
      const caseRecord = await getCaseRecordById(supabase, session.case_id);
      if (caseRecord) {
        const targetState: CaseStatus = "submitted";
        const result = await transition(
          {
            entityType: "case_status",
            entityId: caseRecord.id,
            fromState: caseRecord.status,
            toState: targetState,
            actorUserId: ctx.userId,
            actorAccountType: ctx.accountType,
            tenantId: caseRecord.organization_id ?? undefined,
            metadata: { triggered_by: "intake.submit", submission_id: submission.id },
          },
          supabase,
        );
        if (!result.success) {
          // Decision 5: do NOT roll back the submission row. Log as a deferred action
          // — downstream operators can re-trigger the case transition out-of-band.
          console.warn(
            `[intakeService.submitIntake] case transition skipped for case ${caseRecord.id}: ${result.reason}`,
          );
        }
      }
    } catch (err) {
      console.warn(
        `[intakeService.submitIntake] case transition phase failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  return serializeForApplicant(submittedSession, submission);
}

// ---------------------------------------------------------------------------
// getIntake
// ---------------------------------------------------------------------------

export async function getIntake(
  ctx: AuthContext,
  intakeId: string,
  intakeType: "session" | "submission",
  supabase: SupabaseClient,
): Promise<IntakeApplicantView | IntakeProviderView> {
  const actor = buildActor(ctx);

  if (intakeType === "session") {
    const session = await getSessionById(supabase, intakeId);
    if (!session) throw new AppError("NOT_FOUND", "Intake session not found.");

    // For provider/admin viewers we need the case's assigned advocate to evaluate
    // the advocate-only assignment gate. Best-effort fetch — failure denies access
    // via the fall-through assignedTo=undefined check in evalIntake.
    let assignedTo: string | null | undefined = undefined;
    if (session.case_id) {
      const caseRecord = await getCaseRecordById(supabase, session.case_id);
      assignedTo = caseRecord?.assigned_advocate_id ?? null;
    }

    const decision = await can("intake:view", actor, {
      ...sessionToResource(session),
      assignedTo,
    });
    if (!decision.allowed) denyForbidden(decision.message);

    if (ctx.accountType === "applicant") {
      const submission = await getSubmissionBySessionId(supabase, session.id);
      return serializeForApplicant(session, submission);
    }

    // Provider/admin: prefer the immutable submission view if one exists.
    const submission = await getSubmissionBySessionId(supabase, session.id);
    if (submission) {
      const amendments = await listAmendmentsBySubmission(supabase, submission.id);
      return serializeForProvider(submission, amendments);
    }
    return serializeForApplicant(session);
  }

  // intakeType === "submission"
  const submission = await getSubmissionById(supabase, intakeId);
  if (!submission) throw new AppError("NOT_FOUND", "Intake submission not found.");

  let assignedTo: string | null | undefined = undefined;
  if (submission.case_id) {
    const caseRecord = await getCaseRecordById(supabase, submission.case_id);
    assignedTo = caseRecord?.assigned_advocate_id ?? null;
  }

  const decision = await can(
    "intake:view",
    actor,
    submissionToResource(submission, assignedTo),
  );
  if (!decision.allowed) denyForbidden(decision.message);

  if (ctx.accountType === "applicant") {
    const session = await getSessionById(supabase, submission.session_id);
    return serializeForApplicant(session ?? ({
      id: submission.session_id,
      owner_user_id: submission.owner_user_id,
      case_id: submission.case_id,
      support_request_id: null,
      organization_id: submission.organization_id,
      state_code: submission.state_code,
      status: "submitted",
      draft_payload: submission.submitted_payload,
      intake_schema_version: submission.intake_schema_version,
      created_at: submission.submitted_at,
      updated_at: submission.submitted_at,
    } as IntakeSessionRecord), submission);
  }

  const amendments = await listAmendmentsBySubmission(supabase, submission.id);
  return serializeForProvider(submission, amendments);
}

// ---------------------------------------------------------------------------
// lockIntake — Platform Admin only (handled via the global isAdmin bypass)
// ---------------------------------------------------------------------------

export async function lockIntake(
  ctx: AuthContext,
  sessionId: string,
  supabase: SupabaseClient,
): Promise<IntakeApplicantView> {
  const session = await getSessionById(supabase, sessionId);
  if (!session) throw new AppError("NOT_FOUND", "Intake session not found.");

  const actor = buildActor(ctx);
  const decision = await can(
    "intake:lock_from_silent_edits",
    actor,
    sessionToResource(session),
  );
  if (!decision.allowed) denyForbidden(decision.message);

  const updated = await updateSessionStatus(supabase, sessionId, "locked");

  // Audit: no dedicated intake.locked AuditAction exists; reuse case.intake_started
  // tagged with action_subtype='lock'. Adding a dedicated audit action is tracked
  // as a deferred item — see Domain 2.1 implementation notes.
  void logEvent({
    ctx,
    action: "case.intake_started",
    resourceType: "intake_session",
    resourceId: sessionId,
    organizationId: session.organization_id,
    severity: "warning",
    metadata: {
      action_subtype: "lock_from_silent_edits",
      session_id: sessionId,
    },
  });

  return serializeForApplicant(updated);
}

// ---------------------------------------------------------------------------
// resumeIntake
// ---------------------------------------------------------------------------

const ABANDONMENT_THRESHOLD_DAYS = 14;

export async function resumeIntake(
  ctx: AuthContext,
  sessionId: string,
  supabase: SupabaseClient,
): Promise<IntakeApplicantView> {
  const session = await getSessionById(supabase, sessionId);
  if (!session) throw new AppError("NOT_FOUND", "Intake session not found.");

  const actor = buildActor(ctx);
  const decision = await can("intake:view", actor, sessionToResource(session));
  if (!decision.allowed) denyForbidden(decision.message);

  // If the session has been idle past the abandonment threshold and is still in
  // draft, emit an intake_abandoned signal so the org can surface it in their
  // pipeline. Gated on org_id per Decision 9.
  if (session.status === "draft" && session.organization_id) {
    const ageDays =
      (Date.now() - new Date(session.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays >= ABANDONMENT_THRESHOLD_DAYS) {
      void emitSignal(
        {
          orgId: session.organization_id,
          signalType: "intake_abandoned",
          value: 1,
          actorUserId: ctx.userId,
          actorAccountType: ctx.accountType,
          idempotencyKey: `intake_abandoned:${session.id}`,
          metadata: { session_id: session.id, idle_days: Math.floor(ageDays) },
        },
        supabase,
      );
    }
  }

  return serializeForApplicant(session);
}

// ---------------------------------------------------------------------------
// validateIntakeStepForActor
// ---------------------------------------------------------------------------

export async function validateIntakeStepForActor(
  ctx: AuthContext,
  sessionId: string,
  stepKey: string,
  stepData: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<{ valid: boolean; errors: string[] }> {
  const session = await getSessionById(supabase, sessionId);
  if (!session) throw new AppError("NOT_FOUND", "Intake session not found.");

  const actor = buildActor(ctx);
  const decision = await can("intake:save_draft", actor, sessionToResource(session));
  if (!decision.allowed) denyForbidden(decision.message);

  const result = validateIntakeStep(sessionId, stepKey, stepData);

  if (!result.valid && session.organization_id) {
    void emitSignal(
      {
        orgId: session.organization_id,
        signalType: "intake_validation_failure_rate",
        value: result.errors.length,
        actorUserId: ctx.userId,
        actorAccountType: ctx.accountType,
        idempotencyKey: `intake_validation_failure:${session.id}:${stepKey}`,
        metadata: {
          session_id: session.id,
          step_key: stepKey,
          error_count: result.errors.length,
        },
      },
      supabase,
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// amendIntakeSubmission
// ---------------------------------------------------------------------------

export async function amendIntakeSubmission(
  ctx: AuthContext,
  submissionId: string,
  input: AmendIntakeSubmissionInput,
  supabase: SupabaseClient,
): Promise<{ amended: true; amendmentId: string }> {
  const submission = await getSubmissionById(supabase, submissionId);
  if (!submission) throw new AppError("NOT_FOUND", "Intake submission not found.");

  // Look up the linked session to ensure it is not 'locked'.
  const session = await getSessionById(supabase, submission.session_id);
  if (session?.status === "locked") {
    throw new AppError("FORBIDDEN", "This intake session is locked and cannot be amended.");
  }

  // Resolve case assignment for the advocate gate.
  let assignedTo: string | null | undefined = undefined;
  if (submission.case_id) {
    const caseRecord = await getCaseRecordById(supabase, submission.case_id);
    assignedTo = caseRecord?.assigned_advocate_id ?? null;
  }

  const actor = buildActor(ctx);
  const decision = await can(
    "intake:amend_after_submission",
    actor,
    submissionToResource(submission, assignedTo),
  );
  if (!decision.allowed) denyForbidden(decision.message);

  // Pull the previous value from the immutable submitted_payload.
  const previousValue = readDottedPath(submission.submitted_payload, input.fieldKey);

  const amendment = await insertAmendment(supabase, {
    submission_id: submission.id,
    field_key: input.fieldKey,
    previous_value: previousValue,
    new_value: input.newValue,
    reason: input.reason ?? null,
    amended_by_user_id: ctx.userId,
  });

  void logEvent({
    ctx,
    action: "case.intake_amended",
    resourceType: "intake_submission",
    resourceId: submission.id,
    organizationId: submission.organization_id,
    metadata: {
      submission_id: submission.id,
      field_key: input.fieldKey,
      reason: input.reason ?? null,
    },
  });

  return { amended: true, amendmentId: amendment.id };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function readDottedPath(payload: Record<string, unknown>, dottedPath: string): unknown {
  const parts = dottedPath.split(".");
  let cursor: unknown = payload;
  for (const part of parts) {
    if (!cursor || typeof cursor !== "object") return null;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor ?? null;
}
