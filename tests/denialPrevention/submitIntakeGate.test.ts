/**
 * Domain 5.3 — Denial gate on intakeService.submitIntake.
 *
 * Mocks the full intake repository + the denial prevention module so we can
 * drive submitIntake's gate-decision branching without real DB or state-config
 * reads.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Ensure Supabase env vars exist so module imports that touch supabaseAdmin
// don't throw.
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");

vi.mock("@/lib/server/audit/logEvent", () => ({ logEvent: vi.fn() }));
vi.mock("@/lib/server/policy/policyEngine", () => ({
  can: vi.fn().mockResolvedValue({ allowed: true }),
}));
vi.mock("@/lib/server/workflow/engine", () => ({
  transition: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/server/trustSignal", () => ({
  emitSignal: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/server/stateWorkflows/resolvers", () => ({
  resolveActiveStateWorkflowConfig: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/server/translation", () => ({
  resolveActiveTranslationMappingSet: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/server/cases/caseRepository", () => ({
  getCaseRecordById: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/server/intake/intakeValidation", () => ({
  validateSubmissionReadiness: () => ({ ready: true, missingSteps: [] }),
  validateIntakeStep: () => ({ ok: true }),
}));

vi.mock("@/lib/server/intake/buildSearchAttributesFromIntake", () => ({
  buildSearchAttributesFromIntake: () => ({}),
}));

vi.mock("@/lib/server/intake/intakeRepository", () => ({
  getSessionById: vi.fn(),
  insertSession: vi.fn(),
  updateDraftPayload: vi.fn(),
  updateSessionStatus: vi.fn(),
  insertSubmission: vi.fn(),
  getSubmissionById: vi.fn(),
  getSubmissionBySessionId: vi.fn(),
  insertAmendment: vi.fn(),
  listAmendmentsBySubmission: vi.fn(),
  setSessionWorkflowConfig: vi.fn(),
  setSessionTranslationMappingSet: vi.fn(),
}));

// Mock the denial prevention module so the gate decision is controllable.
vi.mock("@/lib/server/denialPrevention", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/denialPrevention")>(
    "@/lib/server/denialPrevention",
  );
  return {
    ...actual,
    buildDenialCheckInput: vi.fn(),
    runDenialCheck: vi.fn(),
    extractMissingItems: vi.fn().mockReturnValue([]),
    scheduleReminders: vi.fn().mockResolvedValue({ scheduled: 0 }),
  };
});

import { submitIntake } from "@/lib/server/intake/intakeService";
import * as repo from "@/lib/server/intake/intakeRepository";
import * as denial from "@/lib/server/denialPrevention";

function makeSession() {
  return {
    id: "sess-1",
    owner_user_id: "user-1",
    organization_id: "org-1",
    case_id: null,
    status: "draft" as const,
    draft_payload: {
      applicant: { firstName: "Test" },
      victim: { firstName: "Test" },
      crime: { dateOfCrime: "2026-01-01" },
      losses: {},
      documents: {},
    },
    intake_schema_version: "v1",
    state_workflow_config_id: null,
    translation_mapping_set_id: null,
    state_code: "IL",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

const ctx = {
  userId: "user-1",
  accountType: "applicant" as const,
  orgId: null,
  isAdmin: false,
} as unknown as Parameters<typeof submitIntake>[0];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.getSessionById).mockResolvedValue(makeSession() as never);
  vi.mocked(repo.updateSessionStatus).mockResolvedValue({
    ...makeSession(),
    status: "submitted",
  } as never);
  vi.mocked(repo.insertSubmission).mockResolvedValue({
    id: "sub-1",
    session_id: "sess-1",
    submitted_at: "2026-01-02T00:00:00Z",
    organization_id: "org-1",
    owner_user_id: "user-1",
  } as never);
  vi.mocked(denial.buildDenialCheckInput).mockResolvedValue({
    stateCode: "IL",
    filingDeadlineDays: 730,
    reportDeadlineDays: 72,
    allowedFilerTypes: ["self_filing_adult"],
    expenseCategoriesClaimed: [],
    documentedExpenseCategories: [],
    requiredFieldsMissing: [],
    ineligibleExpenseCategoriesClaimed: [],
    requiresSubrogation: true,
    requiresReleaseOfInfo: true,
  } as never);
});

// A minimal fake supabase — the submit path only hits .from(table).insert(row)
// when we've allowed it past the BLOCKING gate. Everything else is mocked.
const fakeSupabase = {
  from: () => ({
    insert: () => Promise.resolve({ error: null }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
  }),
} as unknown as Parameters<typeof submitIntake>[2];

describe("submitIntake — denial prevention gate", () => {
  it("blocking risk level throws VALIDATION_ERROR with blocking categories", async () => {
    vi.mocked(denial.runDenialCheck).mockReturnValue({
      overallRiskLevel: "blocking",
      blockingCategories: [13],
      warningCategories: [],
      passedAll: false,
      checks: [
        {
          category: 13,
          name: "authorizations",
          severity: "BLOCKING",
          message: "Required authorizations not signed.",
        },
      ],
    } as never);

    await expect(
      submitIntake(ctx, "sess-1", fakeSupabase),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: expect.stringContaining("blocking"),
    });

    // insertSubmission must NOT have fired — the gate rejected the call.
    expect(repo.insertSubmission).not.toHaveBeenCalled();
  });

  it("high risk level allows submission to proceed (warnings attached)", async () => {
    vi.mocked(denial.runDenialCheck).mockReturnValue({
      overallRiskLevel: "high",
      blockingCategories: [],
      warningCategories: [8, 10],
      passedAll: false,
      checks: [
        { category: 8, name: "expense_docs", severity: "HIGH", message: "..." },
        { category: 10, name: "application_complete", severity: "HIGH", message: "..." },
      ],
    } as never);

    await submitIntake(ctx, "sess-1", fakeSupabase);

    // Submission proceeded past the gate.
    expect(repo.insertSubmission).toHaveBeenCalled();
  });
});
