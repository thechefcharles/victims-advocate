/**
 * Domain 1.1 — SupportRequest: service layer tests.
 *
 * Tests 23–30 from the test plan:
 *   23. createSupportRequest with no active request → success, draft state
 *   24. createSupportRequest when active request exists → CONFLICT
 *   25. submitSupportRequest → draft→submitted, submitted_at set
 *   26. acceptSupportRequest → pending_review→accepted, accepted_at set
 *   27. declineSupportRequest → decline_reason required, declined state
 *   28. Applicant serializer excludes decline_reason when status ≠ declined
 *   29. Provider serializer includes decline_reason and transfer_reason
 *   30. listSupportRequests for applicant returns only their own records
 *
 * Supabase client is fully mocked. Policy engine and workflow engine are mocked
 * to isolate service logic.
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
    fromState: "draft",
    toState: "submitted",
  }),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { can } from "@/lib/server/policy/policyEngine";
import { transition } from "@/lib/server/workflow/engine";
import {
  serializeForApplicant,
  serializeForProvider,
} from "@/lib/server/supportRequests/supportRequestSerializer";
import type { SupportRequestRecord } from "@/lib/server/supportRequests/supportRequestTypes";
import type { AuthContext } from "@/lib/server/auth/context";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<SupportRequestRecord> = {}): SupportRequestRecord {
  return {
    id: "sr-1",
    applicant_id: "applicant-1",
    organization_id: "org-1",
    program_id: null,
    status: "draft",
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    submitted_at: null,
    reviewed_at: null,
    accepted_at: null,
    declined_at: null,
    withdrawn_at: null,
    closed_at: null,
    decline_reason: null,
    transfer_reason: null,
    case_id: null,
    state_workflow_config_id: null,
    ...overrides,
  };
}

function makeCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    user: { id: "applicant-1", email: "test@example.com" },
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
  };
}

/** Builds a minimal mock Supabase client with chainable builder pattern. */
function makeSupabaseMock(overrides: Record<string, unknown> = {}) {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockNot = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockSingle = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockOrder = vi.fn();

  // Default chain returns for read operations
  const chainResult = { data: null, error: null, ...overrides };

  mockMaybeSingle.mockResolvedValue(chainResult);
  mockSingle.mockResolvedValue(chainResult);
  mockOrder.mockResolvedValue({ data: [], error: null });

  // Chain self-referentially
  mockSelect.mockReturnValue({ eq: mockEq, not: mockNot, order: mockOrder, maybeSingle: mockMaybeSingle, single: mockSingle });
  mockEq.mockReturnValue({ eq: mockEq, not: mockNot, maybeSingle: mockMaybeSingle, single: mockSingle, select: mockSelect });
  mockNot.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockUpdate.mockReturnValue({ eq: mockEq });

  const supabase = {
    from: vi.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    }),
    _mocks: { mockSelect, mockEq, mockNot, mockMaybeSingle, mockSingle, mockInsert, mockUpdate, mockOrder },
  };

  return supabase;
}

// ---------------------------------------------------------------------------
// Serializer tests (no Supabase needed — pure unit tests)
// ---------------------------------------------------------------------------

describe("SupportRequest serializers", () => {
  // 28. Applicant serializer excludes decline_reason when status ≠ declined
  it("28. serializeForApplicant: status_reason is null when status is not declined", () => {
    const record = makeRecord({ status: "submitted", decline_reason: "some reason" });
    const view = serializeForApplicant(record);
    expect(view.status_reason).toBeNull();
    // @ts-expect-error — decline_reason must not appear on applicant view
    expect(view.decline_reason).toBeUndefined();
  });

  it("28b. serializeForApplicant: status_reason is set when status is declined", () => {
    const record = makeRecord({ status: "declined", decline_reason: "Program full." });
    const view = serializeForApplicant(record);
    expect(view.status_reason).toBe("Program full.");
  });

  it("28c. serializeForApplicant: reviewed_at is NOT exposed", () => {
    const record = makeRecord({ reviewed_at: "2026-05-01T12:00:00Z" });
    const view = serializeForApplicant(record);
    // @ts-expect-error — reviewed_at must not appear on applicant view
    expect(view.reviewed_at).toBeUndefined();
  });

  it("28d. serializeForApplicant: case_id is NOT exposed", () => {
    const record = makeRecord({ case_id: "case-1" });
    const view = serializeForApplicant(record);
    // @ts-expect-error — case_id must not appear on applicant view
    expect(view.case_id).toBeUndefined();
  });

  it("28e. serializeForApplicant: action_at picks up accepted_at when status is accepted", () => {
    const record = makeRecord({ status: "accepted", accepted_at: "2026-05-02T00:00:00Z" });
    const view = serializeForApplicant(record);
    expect(view.action_at).toBe("2026-05-02T00:00:00Z");
  });

  // 29. Provider serializer includes decline_reason and transfer_reason
  it("29a. serializeForProvider: includes decline_reason", () => {
    const record = makeRecord({ status: "declined", decline_reason: "Not eligible." });
    const view = serializeForProvider(record);
    expect(view.decline_reason).toBe("Not eligible.");
  });

  it("29b. serializeForProvider: includes transfer_reason", () => {
    const record = makeRecord({ status: "transferred", transfer_reason: "Better match." });
    const view = serializeForProvider(record);
    expect(view.transfer_reason).toBe("Better match.");
  });

  it("29c. serializeForProvider: includes reviewed_at", () => {
    const record = makeRecord({ reviewed_at: "2026-05-01T10:00:00Z" });
    const view = serializeForProvider(record);
    expect(view.reviewed_at).toBe("2026-05-01T10:00:00Z");
  });

  it("29d. serializeForProvider: does NOT include state_workflow_config_id", () => {
    const record = makeRecord({ state_workflow_config_id: "cfg-1" });
    const view = serializeForProvider(record);
    // @ts-expect-error — state_workflow_config_id must not appear on provider view
    expect(view.state_workflow_config_id).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Service-layer tests — using repository mocks
// ---------------------------------------------------------------------------

describe("SupportRequest service — createSupportRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });
  });

  // 23. Create with no active request
  it("23. creates a draft request when no active request exists", async () => {
    // Dynamically import to get the fresh mocked module
    const { createSupportRequest } = await import(
      "@/lib/server/supportRequests/supportRequestService"
    );

    // Mock repository functions
    const repoModule = await import("@/lib/server/supportRequests/supportRequestRepository");
    vi.spyOn(repoModule, "findActiveSupportRequestForApplicant").mockResolvedValue(null);
    vi.spyOn(repoModule, "insertSupportRequestRecord").mockResolvedValue(
      makeRecord({ status: "draft" }),
    );

    const supabase = makeSupabaseMock() as unknown as Parameters<typeof createSupportRequest>[2];
    const result = await createSupportRequest(
      makeCtx(),
      { organization_id: "org-1" },
      supabase,
    );

    expect(result.status).toBe("draft");
    expect(result.organization_id).toBe("org-1");
  });

  // 24. Create with existing active request → CONFLICT
  it("24. throws FORBIDDEN when applicant already has an active request", async () => {
    const { createSupportRequest } = await import(
      "@/lib/server/supportRequests/supportRequestService"
    );

    const repoModule = await import("@/lib/server/supportRequests/supportRequestRepository");
    vi.spyOn(repoModule, "findActiveSupportRequestForApplicant").mockResolvedValue(
      makeRecord({ status: "submitted" }),
    );

    const supabase = makeSupabaseMock() as unknown as Parameters<typeof createSupportRequest>[2];

    await expect(
      createSupportRequest(makeCtx(), { organization_id: "org-1" }, supabase),
    ).rejects.toThrow("active support request");
  });
});

describe("SupportRequest service — submitSupportRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });
    vi.mocked(transition).mockResolvedValue({
      success: true,
      transitionId: "txn-1",
      fromState: "draft",
      toState: "submitted",
    });
  });

  // 25. Submit transitions draft → submitted
  it("25. submits request and sets submitted_at", async () => {
    const { submitSupportRequest } = await import(
      "@/lib/server/supportRequests/supportRequestService"
    );

    const repoModule = await import("@/lib/server/supportRequests/supportRequestRepository");
    const draftRecord = makeRecord({ status: "draft" });
    const submittedRecord = makeRecord({ status: "submitted", submitted_at: "2026-05-01T10:00:00Z" });

    vi.spyOn(repoModule, "getSupportRequestById").mockResolvedValue(draftRecord);
    vi.spyOn(repoModule, "updateSupportRequestRecord").mockResolvedValue(submittedRecord);

    const supabase = makeSupabaseMock() as unknown as Parameters<typeof submitSupportRequest>[2];
    const result = await submitSupportRequest(makeCtx(), "sr-1", supabase);

    expect(result.status).toBe("submitted");
    expect(result.submitted_at).toBe("2026-05-01T10:00:00Z");
    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "support_request", fromState: "draft", toState: "submitted" }),
      supabase,
    );
  });
});

describe("SupportRequest service — acceptSupportRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });
    vi.mocked(transition).mockResolvedValue({
      success: true,
      transitionId: "txn-2",
      fromState: "pending_review",
      toState: "accepted",
    });
  });

  // 26. Accept transitions pending_review → accepted
  it("26. accepts request and sets accepted_at", async () => {
    const { acceptSupportRequest } = await import(
      "@/lib/server/supportRequests/supportRequestService"
    );

    const repoModule = await import("@/lib/server/supportRequests/supportRequestRepository");
    const pendingRecord = makeRecord({ status: "pending_review" });
    const acceptedRecord = makeRecord({
      status: "accepted",
      accepted_at: "2026-05-02T09:00:00Z",
      reviewed_at: "2026-05-02T09:00:00Z",
    });

    vi.spyOn(repoModule, "getSupportRequestById").mockResolvedValue(pendingRecord);
    vi.spyOn(repoModule, "updateSupportRequestRecord").mockResolvedValue(acceptedRecord);

    const providerCtx = makeCtx({
      userId: "provider-1",
      accountType: "provider",
      orgId: "org-1",
      role: "organization",
    });

    const supabase = makeSupabaseMock() as unknown as Parameters<typeof acceptSupportRequest>[2];
    const result = await acceptSupportRequest(providerCtx, "sr-1", supabase);

    expect(result.status).toBe("accepted");
    expect(result.accepted_at).toBe("2026-05-02T09:00:00Z");
  });
});

describe("SupportRequest service — declineSupportRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });
    vi.mocked(transition).mockResolvedValue({
      success: true,
      transitionId: "txn-3",
      fromState: "pending_review",
      toState: "declined",
    });
  });

  // 27. Decline requires decline_reason
  it("27a. throws VALIDATION_ERROR when decline_reason is missing", async () => {
    const { declineSupportRequest } = await import(
      "@/lib/server/supportRequests/supportRequestService"
    );

    const supabase = makeSupabaseMock() as unknown as Parameters<typeof declineSupportRequest>[3];

    await expect(
      declineSupportRequest(makeCtx(), "sr-1", { decline_reason: "" }, supabase),
    ).rejects.toThrow("decline_reason is required");
  });

  it("27b. declines request with reason stored", async () => {
    const { declineSupportRequest } = await import(
      "@/lib/server/supportRequests/supportRequestService"
    );

    const repoModule = await import("@/lib/server/supportRequests/supportRequestRepository");
    const pendingRecord = makeRecord({ status: "pending_review" });
    const declinedRecord = makeRecord({
      status: "declined",
      decline_reason: "Not in service area.",
      declined_at: "2026-05-02T10:00:00Z",
      reviewed_at: "2026-05-02T10:00:00Z",
    });

    vi.spyOn(repoModule, "getSupportRequestById").mockResolvedValue(pendingRecord);
    vi.spyOn(repoModule, "updateSupportRequestRecord").mockResolvedValue(declinedRecord);

    const providerCtx = makeCtx({
      userId: "provider-1",
      accountType: "provider",
      orgId: "org-1",
      role: "organization",
    });

    const supabase = makeSupabaseMock() as unknown as Parameters<typeof declineSupportRequest>[3];
    const result = await declineSupportRequest(
      providerCtx,
      "sr-1",
      { decline_reason: "Not in service area." },
      supabase,
    );

    expect(result.status).toBe("declined");
    expect(result.decline_reason).toBe("Not in service area.");
  });
});

describe("SupportRequest service — listSupportRequests (query scope)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });
  });

  // 30. Applicant list scoped to their own records
  it("30. applicant list calls listSupportRequestsByApplicant with their userId", async () => {
    const { listSupportRequests } = await import(
      "@/lib/server/supportRequests/supportRequestService"
    );

    const repoModule = await import("@/lib/server/supportRequests/supportRequestRepository");
    const spy = vi
      .spyOn(repoModule, "listSupportRequestsByApplicant")
      .mockResolvedValue([makeRecord()]);

    const supabase = makeSupabaseMock() as unknown as Parameters<typeof listSupportRequests>[2];
    const results = await listSupportRequests(makeCtx({ userId: "applicant-1" }), {}, supabase);

    expect(spy).toHaveBeenCalledWith(supabase, "applicant-1", {});
    expect(results).toHaveLength(1);
  });

  it("30b. provider list calls listSupportRequestsByOrganization with their orgId", async () => {
    const { listSupportRequests } = await import(
      "@/lib/server/supportRequests/supportRequestService"
    );

    const repoModule = await import("@/lib/server/supportRequests/supportRequestRepository");
    const spy = vi
      .spyOn(repoModule, "listSupportRequestsByOrganization")
      .mockResolvedValue([makeRecord()]);

    const providerCtx = makeCtx({
      userId: "provider-1",
      accountType: "provider",
      orgId: "org-1",
      role: "organization",
    });

    const supabase = makeSupabaseMock() as unknown as Parameters<typeof listSupportRequests>[2];
    const results = await listSupportRequests(providerCtx, {}, supabase);

    expect(spy).toHaveBeenCalledWith(supabase, "org-1", {});
    expect(results).toHaveLength(1);
  });
});

// 22 (state test integration) — stale fromState optimistic concurrency
describe("SupportRequest service — optimistic concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });
    vi.mocked(transition).mockResolvedValue({
      success: true,
      transitionId: "txn-4",
      fromState: "draft",
      toState: "submitted",
    });
  });

  it("22. throws FORBIDDEN when updateSupportRequestRecord returns null (stale fromState)", async () => {
    const { submitSupportRequest } = await import(
      "@/lib/server/supportRequests/supportRequestService"
    );

    const repoModule = await import("@/lib/server/supportRequests/supportRequestRepository");
    vi.spyOn(repoModule, "getSupportRequestById").mockResolvedValue(makeRecord({ status: "draft" }));
    // Simulate concurrent modification — update returns null (status already changed)
    vi.spyOn(repoModule, "updateSupportRequestRecord").mockResolvedValue(null);

    const supabase = makeSupabaseMock() as unknown as Parameters<typeof submitSupportRequest>[2];

    await expect(
      submitSupportRequest(makeCtx(), "sr-1", supabase),
    ).rejects.toThrow("modified by another action");
  });
});
