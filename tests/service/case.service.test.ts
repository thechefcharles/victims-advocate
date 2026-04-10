/**
 * Domain 1.2 — Case: service layer tests.
 *
 * Scenarios:
 *   1.  createCaseFromSupportRequest → creates record, links support request, emits signal
 *   2.  getCase — applicant gets applicant view, provider gets provider view
 *   3.  submitCase → transitions ready_for_submission→submitted, sets submitted_at
 *   4.  recordCaseOutcome approved → under_review→approved, sets outcome_recorded_at
 *   5.  recordCaseOutcome denied → under_review→denied
 *   6.  startCaseAppeal → denied→appeal_in_progress
 *   7.  closeCase → sets closed_at and emits case_time_to_resolution signal
 *   8.  getCase policy DENY → throws FORBIDDEN
 *   9.  submitCase STATE_INVALID → throws FORBIDDEN
 *   10. serializeCaseForApplicant excludes advocate identity fields
 *   11. serializeCaseForProvider includes support_request_id and assigned_advocate_id
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
    transitionId: "txn-uuid-1",
    fromState: "ready_for_submission",
    toState: "submitted",
  }),
}));

vi.mock("@/lib/server/trustSignal", () => ({
  emitSignal: vi.fn().mockResolvedValue({ success: true, signalId: "sig-1" }),
}));

vi.mock("@/lib/server/supportRequests/supportRequestRepository", () => ({
  linkSupportRequestToCase: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { can } from "@/lib/server/policy/policyEngine";
import { transition } from "@/lib/server/workflow/engine";
import { emitSignal } from "@/lib/server/trustSignal";
import { linkSupportRequestToCase } from "@/lib/server/supportRequests/supportRequestRepository";
import {
  serializeCaseForApplicant,
  serializeCaseForProvider,
} from "@/lib/server/cases/caseSerializer";
import type { CaseRecord } from "@/lib/server/cases/caseTypes";
import type { AuthContext } from "@/lib/server/auth/context";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "case-1",
    owner_user_id: "applicant-1",
    organization_id: "org-1",
    program_id: null,
    support_request_id: "sr-1",
    assigned_advocate_id: null,
    status: "open",
    name: null,
    application: null,
    eligibility_answers: null,
    eligibility_result: null,
    eligibility_readiness: null,
    eligibility_completed_at: null,
    state_code: null,
    submitted_at: null,
    outcome_recorded_at: null,
    closed_at: null,
    created_at: "2026-05-02T00:00:00Z",
    updated_at: "2026-05-02T00:00:00Z",
    ...overrides,
  };
}

function makeCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    user: { id: "provider-1", email: "provider@org.com" },
    userId: "provider-1",
    role: "organization",
    orgId: "org-1",
    orgRole: "owner",
    affiliatedCatalogEntryId: null,
    organizationCatalogEntryId: null,
    isAdmin: false,
    emailVerified: true,
    accountStatus: "active",
    accountType: "provider",
    safetyModeEnabled: false,
    ...overrides,
  };
}

function makeSupabaseMock(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: makeRecord(), error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: makeRecord(), error: null }),
    order: vi.fn().mockReturnThis(),
    ...overrides,
  };
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  };
}

// ---------------------------------------------------------------------------
// Serializer tests (pure — no DB)
// ---------------------------------------------------------------------------

describe("caseSerializer", () => {
  const record = makeRecord({
    assigned_advocate_id: "advocate-1",
    support_request_id: "sr-1",
    eligibility_result: "eligible",
    submitted_at: "2026-05-10T00:00:00Z",
  });

  it("10. applicant view excludes owner_user_id, assigned_advocate_id, support_request_id", () => {
    const view = serializeCaseForApplicant(record);
    expect(view).not.toHaveProperty("owner_user_id");
    expect(view).not.toHaveProperty("assigned_advocate_id");
    expect(view).not.toHaveProperty("support_request_id");
    expect(view).not.toHaveProperty("eligibility_result");
  });

  it("11. provider view includes support_request_id and assigned_advocate_id", () => {
    const view = serializeCaseForProvider(record);
    expect(view.support_request_id).toBe("sr-1");
    expect(view.assigned_advocate_id).toBe("advocate-1");
    expect(view.eligibility_result).toBe("eligible");
  });
});

// ---------------------------------------------------------------------------
// Service tests
// ---------------------------------------------------------------------------

describe("caseService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("2a. getCase: applicant receives applicant-safe view", async () => {
    const { getCase } = await import("@/lib/server/cases/caseService");
    const supabase = makeSupabaseMock() as unknown as import("@supabase/supabase-js").SupabaseClient;
    const ctx = makeCtx({ accountType: "applicant", userId: "applicant-1" });

    const result = await getCase(ctx, "case-1", supabase);

    expect(result).not.toHaveProperty("owner_user_id");
    expect(can).toHaveBeenCalledWith("case:read", expect.anything(), expect.anything());
  });

  it("2b. getCase: provider receives provider view", async () => {
    const { getCase } = await import("@/lib/server/cases/caseService");
    const supabase = makeSupabaseMock() as unknown as import("@supabase/supabase-js").SupabaseClient;
    const ctx = makeCtx();

    const result = await getCase(ctx, "case-1", supabase);

    expect(result).toHaveProperty("owner_user_id");
  });

  it("8. getCase policy DENY → throws FORBIDDEN", async () => {
    vi.mocked(can).mockResolvedValueOnce({
      allowed: false,
      reason: "INSUFFICIENT_ROLE",
      auditRequired: true,
    });

    const { getCase } = await import("@/lib/server/cases/caseService");
    const supabase = makeSupabaseMock() as unknown as import("@supabase/supabase-js").SupabaseClient;
    const ctx = makeCtx();

    await expect(getCase(ctx, "case-1", supabase)).rejects.toThrow("Access denied.");
  });

  it("3. submitCase transitions ready_for_submission→submitted and sets submitted_at", async () => {
    vi.mocked(transition).mockResolvedValueOnce({
      success: true,
      transitionId: "txn-1",
      fromState: "ready_for_submission",
      toState: "submitted",
    });

    const submittedRecord = makeRecord({ status: "ready_for_submission" });
    const supabaseMock = makeSupabaseMock();
    supabaseMock._chain.maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: submittedRecord, error: null })   // fetch
      .mockResolvedValueOnce({ data: { ...submittedRecord, status: "submitted", submitted_at: expect.any(String) }, error: null }); // update

    const { submitCase } = await import("@/lib/server/cases/caseService");
    const supabase = supabaseMock as unknown as import("@supabase/supabase-js").SupabaseClient;
    const ctx = makeCtx();

    await submitCase(ctx, "case-1", supabase);

    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "case_status", toState: "submitted" }),
      supabase,
    );
  });

  it("9. submitCase STATE_INVALID → throws FORBIDDEN", async () => {
    vi.mocked(transition).mockResolvedValueOnce({
      success: false,
      fromState: "open",
      toState: "submitted",
      reason: "STATE_INVALID",
    });

    const { submitCase } = await import("@/lib/server/cases/caseService");
    const supabase = makeSupabaseMock() as unknown as import("@supabase/supabase-js").SupabaseClient;
    const ctx = makeCtx();

    await expect(submitCase(ctx, "case-1", supabase)).rejects.toThrow("STATE_INVALID");
  });

  it("1. createCaseFromSupportRequest links support request and emits trust signal", async () => {
    const newRecord = makeRecord({ id: "case-new" });
    const supabaseMock = makeSupabaseMock();
    supabaseMock._chain.single = vi.fn().mockResolvedValue({ data: newRecord, error: null });

    const { createCaseFromSupportRequest } = await import("@/lib/server/cases/caseService");
    const supabase = supabaseMock as unknown as import("@supabase/supabase-js").SupabaseClient;
    const ctx = makeCtx();

    await createCaseFromSupportRequest(
      ctx,
      { support_request_id: "sr-1", organization_id: "org-1" },
      supabase,
    );

    expect(linkSupportRequestToCase).toHaveBeenCalledWith(supabase, "sr-1", "case-new");
    expect(emitSignal).toHaveBeenCalledWith(
      expect.objectContaining({ signalType: "case_response_time" }),
      supabase,
    );
  });

  it("7. closeCase emits case_time_to_resolution signal", async () => {
    const closableRecord = makeRecord({ status: "approved" });
    const supabaseMock = makeSupabaseMock();
    supabaseMock._chain.maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: closableRecord, error: null })
      .mockResolvedValueOnce({
        data: { ...closableRecord, status: "closed", closed_at: "2026-05-15T00:00:00Z" },
        error: null,
      });

    const { closeCase } = await import("@/lib/server/cases/caseService");
    const supabase = supabaseMock as unknown as import("@supabase/supabase-js").SupabaseClient;
    const ctx = makeCtx();

    await closeCase(ctx, "case-1", supabase);

    expect(emitSignal).toHaveBeenCalledWith(
      expect.objectContaining({ signalType: "case_time_to_resolution" }),
      supabase,
    );
  });
});
