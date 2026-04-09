/**
 * Domain 2.1 — Intake: service layer tests.
 *
 * Scenarios:
 *   1.  startIntake → inserts session, emits intake_started signal when org_id present
 *   2.  startIntake → does NOT emit signal when org_id is null
 *   3.  saveIntakeDraft → updates draft + dual-writes to cases.application
 *   4.  saveIntakeDraft → no dual-write when session has no case_id
 *   5.  saveIntakeDraft → DENY when session is submitted
 *   6.  submitIntake → inserts submission, updates status, emits intake_completed
 *   7.  submitIntake → calls transition() in phase B when case_id is present
 *   8.  submitIntake → tolerates failed transition (does NOT roll back submission)
 *   9.  submitIntake → throws VALIDATION_ERROR when readiness check fails
 *   10. lockIntake → DENY for non-admin actor (provider tries lock)
 *   11. amendIntakeSubmission → inserts amendment, captures previous_value
 *   12. amendIntakeSubmission → DENY when session is locked
 *
 * Supabase, policy engine, workflow engine, and trust signal are all mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before imports
// ---------------------------------------------------------------------------

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/policy/policyEngine", () => ({
  can: vi.fn().mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false }),
}));

vi.mock("@/lib/server/workflow/engine", () => ({
  transition: vi.fn().mockResolvedValue({
    success: true,
    transitionId: "txn-1",
    fromState: "ready_for_submission",
    toState: "submitted",
  }),
}));

vi.mock("@/lib/server/trustSignal", () => ({
  emitSignal: vi.fn().mockResolvedValue({ success: true, signalId: "sig-1" }),
}));

// Domain 2.2 cross-domain mock — startIntake calls this. Default to null
// (no active config) so legacy tests behave the same as before.
vi.mock("@/lib/server/stateWorkflows/resolvers", () => ({
  resolveActiveStateWorkflowConfig: vi.fn().mockResolvedValue(null),
}));

// Domain 2.4 cross-domain mock — startIntake also calls this. Default null.
vi.mock("@/lib/server/translation", () => ({
  resolveActiveTranslationMappingSet: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/server/cases/caseRepository", () => ({
  getCaseRecordById: vi.fn().mockResolvedValue({
    id: "case-1",
    owner_user_id: "applicant-1",
    organization_id: "org-1",
    program_id: null,
    support_request_id: null,
    assigned_advocate_id: "advocate-1",
    status: "ready_for_submission",
    name: null,
    application: null,
    eligibility_answers: null,
    eligibility_result: null,
    eligibility_readiness: null,
    eligibility_completed_at: null,
    state_code: "IL",
    submitted_at: null,
    outcome_recorded_at: null,
    closed_at: null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  }),
}));

// Mock the repository so the service tests do not touch supabase chains.
vi.mock("@/lib/server/intake/intakeRepository", () => ({
  getSessionById: vi.fn(),
  getSessionsByOwner: vi.fn(),
  insertSession: vi.fn(),
  updateDraftPayload: vi.fn(),
  updateSessionStatus: vi.fn(),
  insertSubmission: vi.fn(),
  getSubmissionById: vi.fn(),
  getSubmissionBySessionId: vi.fn(),
  insertAmendment: vi.fn(),
  listAmendmentsBySubmission: vi.fn().mockResolvedValue([]),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { can } from "@/lib/server/policy/policyEngine";
import { transition } from "@/lib/server/workflow/engine";
import { emitSignal } from "@/lib/server/trustSignal";
import * as repo from "@/lib/server/intake/intakeRepository";
import type { AuthContext } from "@/lib/server/auth/context";
import type {
  IntakeSessionRecord,
  IntakeSubmissionRecord,
} from "@/lib/server/intake/intakeTypes";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<IntakeSessionRecord> = {}): IntakeSessionRecord {
  return {
    id: "session-1",
    owner_user_id: "applicant-1",
    case_id: "case-1",
    support_request_id: null,
    organization_id: "org-1",
    state_code: "IL",
    status: "draft",
    draft_payload: {
      victim: { firstName: "A", lastName: "B" },
      applicant: { isSameAsVictim: true },
      crime: { dateOfCrime: "2026-03-01", crimeCounty: "Cook" },
      contact: { preferredLanguage: "en", workingWithAdvocate: true },
      losses: {},
      protectionAndCivil: {},
    },
    intake_schema_version: "v1",
    state_workflow_config_id: null,
    translation_mapping_set_id: null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-02T00:00:00Z",
    ...overrides,
  };
}

function makeSubmission(overrides: Partial<IntakeSubmissionRecord> = {}): IntakeSubmissionRecord {
  return {
    id: "submission-1",
    session_id: "session-1",
    case_id: "case-1",
    organization_id: "org-1",
    owner_user_id: "applicant-1",
    submitted_payload: {
      crime: { crimeCounty: "Cook" },
      contact: { preferredLanguage: "en" },
    },
    intake_schema_version: "v1",
    state_workflow_config_id: null,
    translation_mapping_set_id: null,
    state_code: "IL",
    submitted_at: "2026-04-08T12:00:00Z",
    submitted_by_user_id: "applicant-1",
    ...overrides,
  };
}

function makeApplicantCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    user: { id: "applicant-1", email: "applicant@test.com" },
    userId: "applicant-1",
    role: "victim",
    orgId: null,
    orgRole: null,
    affiliatedCatalogEntryId: null,
    organizationCatalogEntryId: null,
    isAdmin: false,
    emailVerified: true,
    accountStatus: "active",
    accountType: "applicant",
    safetyModeEnabled: false,
    ...overrides,
  } as unknown as AuthContext;
}

const fakeSupabase = {} as unknown as import("@supabase/supabase-js").SupabaseClient;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("intakeService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("1. startIntake inserts session and emits intake_started when org_id is set", async () => {
    vi.mocked(repo.insertSession).mockResolvedValueOnce(makeSession());

    const { startIntake } = await import("@/lib/server/intake/intakeService");
    await startIntake(
      makeApplicantCtx(),
      { state_code: "IL", organization_id: "org-1" },
      fakeSupabase,
    );

    expect(repo.insertSession).toHaveBeenCalled();
    expect(emitSignal).toHaveBeenCalledWith(
      expect.objectContaining({ signalType: "intake_started", orgId: "org-1" }),
      fakeSupabase,
    );
  });

  it("2. startIntake does NOT emit signal when org_id is null (Decision 9)", async () => {
    vi.mocked(repo.insertSession).mockResolvedValueOnce(
      makeSession({ organization_id: null }),
    );

    const { startIntake } = await import("@/lib/server/intake/intakeService");
    await startIntake(makeApplicantCtx(), { state_code: "IL" }, fakeSupabase);

    expect(emitSignal).not.toHaveBeenCalled();
  });

  it("3. saveIntakeDraft writes draft and dual-writes cases.application when case_id is present", async () => {
    const session = makeSession();
    vi.mocked(repo.getSessionById).mockResolvedValueOnce(session);
    vi.mocked(repo.updateDraftPayload).mockResolvedValueOnce({
      ...session,
      draft_payload: { foo: "bar" },
    });

    const { saveIntakeDraft } = await import("@/lib/server/intake/intakeService");
    await saveIntakeDraft(
      makeApplicantCtx(),
      "session-1",
      { draftPayload: { foo: "bar" } },
      fakeSupabase,
    );

    expect(repo.updateDraftPayload).toHaveBeenCalledWith(
      fakeSupabase,
      "session-1",
      { foo: "bar" },
      { caseId: "case-1", payload: { foo: "bar" } },
    );
  });

  it("4. saveIntakeDraft skips dual-write when session has no case_id", async () => {
    const session = makeSession({ case_id: null });
    vi.mocked(repo.getSessionById).mockResolvedValueOnce(session);
    vi.mocked(repo.updateDraftPayload).mockResolvedValueOnce(session);

    const { saveIntakeDraft } = await import("@/lib/server/intake/intakeService");
    await saveIntakeDraft(
      makeApplicantCtx(),
      "session-1",
      { draftPayload: { foo: "bar" } },
      fakeSupabase,
    );

    expect(repo.updateDraftPayload).toHaveBeenCalledWith(
      fakeSupabase,
      "session-1",
      { foo: "bar" },
      undefined,
    );
  });

  it("5. saveIntakeDraft on submitted session → throws FORBIDDEN", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValueOnce(
      makeSession({ status: "submitted" }),
    );

    const { saveIntakeDraft } = await import("@/lib/server/intake/intakeService");
    await expect(
      saveIntakeDraft(
        makeApplicantCtx(),
        "session-1",
        { draftPayload: {} },
        fakeSupabase,
      ),
    ).rejects.toThrow("no longer editable");
  });

  it("6. submitIntake inserts submission, updates status, emits intake_completed", async () => {
    const session = makeSession();
    vi.mocked(repo.getSessionById).mockResolvedValueOnce(session);
    vi.mocked(repo.insertSubmission).mockResolvedValueOnce(makeSubmission());
    vi.mocked(repo.updateSessionStatus).mockResolvedValueOnce({
      ...session,
      status: "submitted",
    });

    const { submitIntake } = await import("@/lib/server/intake/intakeService");
    await submitIntake(makeApplicantCtx(), "session-1", fakeSupabase);

    expect(repo.insertSubmission).toHaveBeenCalled();
    expect(repo.updateSessionStatus).toHaveBeenCalledWith(fakeSupabase, "session-1", "submitted");
    expect(emitSignal).toHaveBeenCalledWith(
      expect.objectContaining({ signalType: "intake_completed" }),
      fakeSupabase,
    );
  });

  it("7. submitIntake calls transition() in phase B when case_id is present", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValueOnce(makeSession());
    vi.mocked(repo.insertSubmission).mockResolvedValueOnce(makeSubmission());
    vi.mocked(repo.updateSessionStatus).mockResolvedValueOnce(
      makeSession({ status: "submitted" }),
    );

    const { submitIntake } = await import("@/lib/server/intake/intakeService");
    await submitIntake(makeApplicantCtx(), "session-1", fakeSupabase);

    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "case_status",
        toState: "submitted",
      }),
      fakeSupabase,
    );
  });

  it("8. submitIntake tolerates failed transition (does NOT roll back submission)", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValueOnce(makeSession());
    vi.mocked(repo.insertSubmission).mockResolvedValueOnce(makeSubmission());
    vi.mocked(repo.updateSessionStatus).mockResolvedValueOnce(
      makeSession({ status: "submitted" }),
    );
    vi.mocked(transition).mockResolvedValueOnce({
      success: false,
      fromState: "open",
      toState: "submitted",
      reason: "STATE_INVALID",
    });

    // Suppress expected console.warn for this test only
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { submitIntake } = await import("@/lib/server/intake/intakeService");
    const result = await submitIntake(makeApplicantCtx(), "session-1", fakeSupabase);

    // Submission was still created
    expect(repo.insertSubmission).toHaveBeenCalled();
    expect(repo.updateSessionStatus).toHaveBeenCalled();
    expect(result.status).toBe("submitted");

    warnSpy.mockRestore();
  });

  it("9. submitIntake throws VALIDATION_ERROR when readiness check fails", async () => {
    // Empty draft_payload → all required steps missing.
    vi.mocked(repo.getSessionById).mockResolvedValueOnce(
      makeSession({ draft_payload: {} }),
    );

    const { submitIntake } = await import("@/lib/server/intake/intakeService");
    await expect(
      submitIntake(makeApplicantCtx(), "session-1", fakeSupabase),
    ).rejects.toThrow("not ready for submission");
  });

  it("10. lockIntake DENIES non-admin actor", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValueOnce(makeSession());
    vi.mocked(can).mockResolvedValueOnce({
      allowed: false,
      reason: "INSUFFICIENT_ROLE",
      auditRequired: true,
      message: "Platform administrator access required to lock intake sessions.",
    });

    const { lockIntake } = await import("@/lib/server/intake/intakeService");
    await expect(
      lockIntake(makeApplicantCtx(), "session-1", fakeSupabase),
    ).rejects.toThrow("Platform administrator");
  });

  it("11. amendIntakeSubmission inserts amendment with captured previous_value", async () => {
    const submission = makeSubmission({
      submitted_payload: { crime: { crimeCounty: "Cook" } },
    });
    vi.mocked(repo.getSubmissionById).mockResolvedValueOnce(submission);
    vi.mocked(repo.getSessionById).mockResolvedValueOnce(makeSession({ status: "submitted" }));
    vi.mocked(repo.insertAmendment).mockResolvedValueOnce({
      id: "amendment-1",
      submission_id: "submission-1",
      field_key: "crime.crimeCounty",
      previous_value: "Cook",
      new_value: "DuPage",
      reason: "applicant correction",
      amended_by_user_id: "advocate-1",
      amended_at: "2026-04-09T00:00:00Z",
    });

    const { amendIntakeSubmission } = await import(
      "@/lib/server/intake/intakeService"
    );
    const ctx = makeApplicantCtx({
      userId: "advocate-1",
      accountType: "provider",
    });
    const result = await amendIntakeSubmission(
      ctx,
      "submission-1",
      { fieldKey: "crime.crimeCounty", newValue: "DuPage", reason: "applicant correction" },
      fakeSupabase,
    );

    expect(repo.insertAmendment).toHaveBeenCalledWith(
      fakeSupabase,
      expect.objectContaining({
        submission_id: "submission-1",
        field_key: "crime.crimeCounty",
        previous_value: "Cook",
        new_value: "DuPage",
      }),
    );
    expect(result).toEqual({ amended: true, amendmentId: "amendment-1" });
  });

  it("12. amendIntakeSubmission DENIES when session is locked", async () => {
    vi.mocked(repo.getSubmissionById).mockResolvedValueOnce(makeSubmission());
    vi.mocked(repo.getSessionById).mockResolvedValueOnce(
      makeSession({ status: "locked" }),
    );

    const { amendIntakeSubmission } = await import(
      "@/lib/server/intake/intakeService"
    );
    await expect(
      amendIntakeSubmission(
        makeApplicantCtx({ userId: "advocate-1", accountType: "provider" }),
        "submission-1",
        { fieldKey: "crime.crimeCounty", newValue: "DuPage" },
        fakeSupabase,
      ),
    ).rejects.toThrow("locked");
  });
});
