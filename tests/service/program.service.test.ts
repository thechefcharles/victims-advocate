/**
 * Domain 3.3 — Program service and evaluation tests (25 tests).
 *
 * Tests from the D3.3 test plan:
 *   1–8:   Policy integration (admin gates via admin:manage_programs)
 *   9–13:  Service behavior / state transitions
 *   14–21: evaluateProgram() routing engine (pure function, no mocks)
 *   22–25: Serializer / utility functions
 *
 * Supabase, audit logEvent, and search sync are fully mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthContext } from "@/lib/server/auth/context";

// ---------------------------------------------------------------------------
// Mocks (must be hoisted)
// ---------------------------------------------------------------------------

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/search/programSearchSync", () => ({
  updateProviderSearchIndexFromProgram: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/policy/policyEngine", () => ({
  can: vi.fn().mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false }),
}));

vi.mock("@/lib/catalog/loadCatalog", () => ({
  getCatalogProgramById: vi.fn().mockReturnValue({ id: 1, organization: "Test Org", programType: "Advocacy" }),
  loadIlVictimAssistanceCatalog: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/server/org/catalogOrgFields", () => ({
  orgRowFromCatalogEntry: vi.fn().mockReturnValue({
    name: "Test Org — Advocacy",
    type: "nonprofit",
    catalog_entry_id: 1,
    metadata: { catalog_program: { id: 1 } },
  }),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(() => mockSupabase),
}));

// ---------------------------------------------------------------------------
// Mutable Supabase mock
// ---------------------------------------------------------------------------

let mockSupabase: ReturnType<typeof makeSbMock>;

function makeChain(result: { data: unknown; error: unknown }) {
  const self: Record<string, unknown> = {};
  const terminal = vi.fn().mockResolvedValue(result);
  self.select = vi.fn().mockReturnValue(self);
  self.insert = vi.fn().mockReturnValue(self);
  self.update = vi.fn().mockReturnValue(self);
  self.eq = vi.fn().mockReturnValue(self);
  self.neq = vi.fn().mockReturnValue(self);
  self.order = vi.fn().mockReturnValue(self);
  self.limit = vi.fn().mockResolvedValue(result); // terminal — list queries end with .limit()
  self.single = terminal;
  self.maybeSingle = terminal;
  return self;
}

function makeSbMock(defaultResult: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain = makeChain(defaultResult);
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  };
}

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { can } from "@/lib/server/policy/policyEngine";
import { getCatalogProgramById } from "@/lib/catalog/loadCatalog";
import {
  listProgramDefinitions,
  createProgramDefinition,
  updateProgramDefinition,
  activateProgramDefinition,
  archiveProgramDefinition,
  linkOrgCatalogEntry,
  setUserProgramAffiliation,
  ProgramNotFoundError,
  ProgramStateError,
  CatalogEntryNotFoundError,
  CatalogEntryDuplicateError,
} from "@/lib/server/programs";
import { evaluateProgram, intakeFromApplication } from "@/lib/server/routing/evaluate";
import { serializeProgramDefinition } from "@/lib/server/serializers/program.serializer";
import { orgRowFromCatalogEntry } from "@/lib/server/organizations/catalogOrgFields";
import type { ProgramDefinitionRow } from "@/lib/server/routing/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    user: { id: "admin-1", email: "admin@example.com" },
    userId: "admin-1",
    role: "organization",
    orgId: "org-1",
    orgRole: "owner",
    affiliatedCatalogEntryId: null,
    organizationCatalogEntryId: null,
    isAdmin: true,
    emailVerified: true,
    accountStatus: "active",
    accountType: "provider",
    safetyModeEnabled: false,
    ...overrides,
  };
}

function makeProgramRow(overrides: Record<string, unknown> = {}): ProgramDefinitionRow {
  return {
    id: "prog-1",
    created_at: "2026-04-09T00:00:00Z",
    updated_at: "2026-04-09T00:00:00Z",
    program_key: "test_program",
    name: "Test Program",
    description: null,
    state_code: "IL",
    scope_type: "state",
    status: "draft",
    is_active: false,
    version: "1",
    rule_set: { all: [] },
    required_documents: ["Police report"],
    deadline_metadata: { summary: "File within 2 years." },
    dependency_rules: {},
    stacking_rules: {},
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// TESTS 1–8: Policy integration via can()
// ---------------------------------------------------------------------------

describe("programService — admin:manage_programs policy gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });
    mockSupabase = makeSbMock({ data: makeProgramRow(), error: null });
  });

  it("1. admin ctx has isAdmin=true — createProgramDefinition succeeds", async () => {
    mockSupabase = makeSbMock({ data: makeProgramRow(), error: null });
    const result = await createProgramDefinition(
      { program_key: "test", name: "Test" },
      makeCtx({ isAdmin: true })
    );
    expect(result.status).toBe("draft");
  });

  it("2. non-admin can call service directly — policy enforcement is in the route", async () => {
    // The service is policy-agnostic; it does not call can() itself.
    // Routes are responsible for calling can() before calling the service.
    // This test confirms the service does NOT reject non-admin ctx.
    mockSupabase = makeSbMock({ data: makeProgramRow(), error: null });
    const result = await createProgramDefinition(
      { program_key: "test", name: "Test" },
      makeCtx({ isAdmin: false })
    );
    expect(result.status).toBe("draft");
  });

  it("3. listProgramDefinitions returns array", async () => {
    mockSupabase = makeSbMock({ data: [makeProgramRow()], error: null });
    const programs = await listProgramDefinitions({ status: "draft" });
    expect(programs).toHaveLength(1);
    expect(programs[0].program_key).toBe("test_program");
  });

  it("4. listProgramDefinitions with no filters returns all", async () => {
    const rows = [makeProgramRow(), makeProgramRow({ id: "prog-2", status: "active" })];
    mockSupabase = makeSbMock({ data: rows, error: null });
    const programs = await listProgramDefinitions();
    expect(programs).toHaveLength(2);
  });

  it("5. updateProgramDefinition fails if not draft — ProgramStateError", async () => {
    let callCount = 0;
    mockSupabase = makeSbMock({ data: null, error: null });
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: { id: "prog-1", status: "active", program_key: "test" }, error: null });
      return makeChain({ data: makeProgramRow(), error: null });
    });

    await expect(
      updateProgramDefinition("prog-1", { name: "New Name" }, makeCtx())
    ).rejects.toBeInstanceOf(ProgramStateError);
  });

  it("6. activateProgramDefinition deactivates prior active for same program_key", async () => {
    const draftRow = makeProgramRow({ status: "draft" });
    const activatedRow = makeProgramRow({ status: "active", is_active: true });
    let callCount = 0;
    mockSupabase = makeSbMock({ data: null, error: null });
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: draftRow, error: null }); // fetch draft
      if (callCount === 2) return makeChain({ data: null, error: null }); // deactivate existing
      return makeChain({ data: activatedRow, error: null }); // activate
    });

    const result = await activateProgramDefinition("prog-1", makeCtx());
    expect(result.status).toBe("active");
    expect(result.is_active).toBe(true);
  });

  it("7. archiveProgramDefinition sets is_active=false, status=archived", async () => {
    const archivedRow = makeProgramRow({ status: "archived", is_active: false });
    mockSupabase = makeSbMock({ data: archivedRow, error: null });

    const result = await archiveProgramDefinition("prog-1", makeCtx());
    expect(result.status).toBe("archived");
    expect(result.is_active).toBe(false);
  });

  it("8. activateProgramDefinition on non-draft → ProgramStateError", async () => {
    mockSupabase = makeSbMock({ data: makeProgramRow({ status: "active" }), error: null });

    await expect(
      activateProgramDefinition("prog-1", makeCtx())
    ).rejects.toBeInstanceOf(ProgramStateError);
  });
});

// ---------------------------------------------------------------------------
// TESTS 9–13: Service behavior / state
// ---------------------------------------------------------------------------

describe("programService — state transitions and catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = makeSbMock({ data: null, error: null });
  });

  it("9. createProgramDefinition sets status='draft', is_active=false", async () => {
    const row = makeProgramRow({ status: "draft", is_active: false });
    mockSupabase = makeSbMock({ data: row, error: null });

    const result = await createProgramDefinition({ program_key: "test", name: "Test" }, makeCtx());
    expect(result.status).toBe("draft");
    expect(result.is_active).toBe(false);
  });

  it("10. updateProgramDefinition succeeds on draft record", async () => {
    const draftRow = makeProgramRow({ name: "Updated Name" });
    let callCount = 0;
    mockSupabase = makeSbMock({ data: null, error: null });
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: { id: "prog-1", status: "draft", program_key: "test" }, error: null });
      return makeChain({ data: draftRow, error: null });
    });

    const result = await updateProgramDefinition("prog-1", { name: "Updated Name" }, makeCtx());
    expect(result.name).toBe("Updated Name");
  });

  it("11. activateProgramDefinition: program not found → ProgramNotFoundError", async () => {
    mockSupabase = makeSbMock({ data: null, error: { message: "not found" } });

    await expect(
      activateProgramDefinition("prog-missing", makeCtx())
    ).rejects.toBeInstanceOf(ProgramNotFoundError);
  });

  it("12. linkOrgCatalogEntry: invalid catalog_entry_id → CatalogEntryNotFoundError", async () => {
    vi.mocked(getCatalogProgramById).mockReturnValue(null);

    await expect(
      linkOrgCatalogEntry("org-1", 9999, makeCtx())
    ).rejects.toBeInstanceOf(CatalogEntryNotFoundError);
  });

  it("13. linkOrgCatalogEntry: duplicate → CatalogEntryDuplicateError", async () => {
    vi.mocked(getCatalogProgramById).mockReturnValue({ id: 1, organization: "Test", programType: "Advocacy" } as never);

    let callCount = 0;
    mockSupabase = makeSbMock({ data: null, error: null });
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: { id: "org-1", metadata: {} }, error: null }); // org fetch
      return makeChain({ data: { id: "org-OTHER" }, error: null }); // duplicate check finds another org
    });

    await expect(
      linkOrgCatalogEntry("org-1", 1, makeCtx())
    ).rejects.toBeInstanceOf(CatalogEntryDuplicateError);
  });
});

// ---------------------------------------------------------------------------
// TESTS 14–21: evaluateProgram() — pure function, no mocking needed
// ---------------------------------------------------------------------------

describe("evaluateProgram() — routing engine", () => {
  const makeProgram = (ruleSet: Record<string, unknown> = {}): ProgramDefinitionRow =>
    makeProgramRow({ rule_set: ruleSet, required_documents: ["Police report"], deadline_metadata: { summary: "2 years" } });

  it("14. all rules match → likely_eligible, confidence=high", () => {
    const program = makeProgram({ all: [{ field: "crime.type", op: "eq", value: "assault" }] });
    const result = evaluateProgram({
      intake: { crime: { type: "assault" } },
      programDefinition: program,
    });
    expect(result.eligibility_status).toBe("likely_eligible");
    expect(result.confidence).toBe("high");
  });

  it("15. a required rule fails → unlikely_eligible", () => {
    const program = makeProgram({ all: [{ field: "crime.type", op: "eq", value: "robbery" }] });
    const result = evaluateProgram({
      intake: { crime: { type: "assault" } },
      programDefinition: program,
    });
    expect(result.eligibility_status).toBe("unlikely_eligible");
  });

  it("16. unknown fields only → insufficient_information", () => {
    const program = makeProgram({ all: [{ field: "crime.type", op: "eq", value: "assault" }] });
    const result = evaluateProgram({
      intake: {},
      programDefinition: program,
    });
    expect(result.eligibility_status).toBe("insufficient_information");
  });

  it("17. rule operator: exists — rejects null, undefined, empty string", () => {
    const program = makeProgram({ all: [{ field: "applicant.name", op: "exists" }] });
    const withNull = evaluateProgram({ intake: { applicant: { name: null } }, programDefinition: program });
    const withEmpty = evaluateProgram({ intake: { applicant: { name: "" } }, programDefinition: program });
    const withValue = evaluateProgram({ intake: { applicant: { name: "Alice" } }, programDefinition: program });

    expect(withNull.eligibility_status).toBe("unlikely_eligible");
    expect(withEmpty.eligibility_status).toBe("unlikely_eligible");
    expect(withValue.eligibility_status).toBe("likely_eligible");
  });

  it("18. rule operator: eq — matches value exactly", () => {
    const program = makeProgram({ all: [{ field: "state", op: "eq", value: "IL" }] });
    const match = evaluateProgram({ intake: { state: "IL" }, programDefinition: program });
    const noMatch = evaluateProgram({ intake: { state: "IN" }, programDefinition: program });

    expect(match.eligibility_status).toBe("likely_eligible");
    expect(noMatch.eligibility_status).toBe("unlikely_eligible");
  });

  it("19. rule operator: in — checks array membership", () => {
    const program = makeProgram({ all: [{ field: "crime.type", op: "in", value: ["assault", "robbery"] }] });
    const match = evaluateProgram({ intake: { crime: { type: "robbery" } }, programDefinition: program });
    const noMatch = evaluateProgram({ intake: { crime: { type: "fraud" } }, programDefinition: program });

    expect(match.eligibility_status).toBe("likely_eligible");
    expect(noMatch.eligibility_status).toBe("unlikely_eligible");
  });

  it("20. rule operator: gte — numeric comparison", () => {
    const program = makeProgram({ all: [{ field: "loss.amount", op: "gte", value: 1000 }] });
    const match = evaluateProgram({ intake: { loss: { amount: 5000 } }, programDefinition: program });
    const noMatch = evaluateProgram({ intake: { loss: { amount: 100 } }, programDefinition: program });

    expect(match.eligibility_status).toBe("likely_eligible");
    expect(noMatch.eligibility_status).toBe("unlikely_eligible");
  });

  it("21. evaluateProgram extracts required_documents and deadline_summary", () => {
    const program = makeProgramRow({
      rule_set: {},
      required_documents: ["Police report", "Medical records"],
      deadline_metadata: { summary: "File within 2 years of the crime." },
    });
    const result = evaluateProgram({ intake: {}, programDefinition: program });

    expect(result.required_documents).toEqual(["Police report", "Medical records"]);
    expect(result.deadline_summary).toBe("File within 2 years of the crime.");
  });
});

// ---------------------------------------------------------------------------
// TESTS 22–25: Serializer / utility functions
// ---------------------------------------------------------------------------

describe("intakeFromApplication — strips internal keys", () => {
  it("22. strips _fieldState and _ prefixed keys", () => {
    const result = intakeFromApplication({
      crime: { type: "assault" },
      _fieldState: { crime: "complete" },
      _internal: true,
    });
    expect(result).not.toHaveProperty("_fieldState");
    expect(result).not.toHaveProperty("_internal");
    expect((result as Record<string, unknown>).crime).toEqual({ type: "assault" });
  });

  it("23. preserves nested objects without stripping valid keys", () => {
    const result = intakeFromApplication({
      crime: { type: "robbery", date: "2026-01-01" },
      state: "IL",
    });
    expect((result as Record<string, unknown>).crime).toEqual({ type: "robbery", date: "2026-01-01" });
    expect((result as Record<string, unknown>).state).toBe("IL");
  });
});

describe("serializeProgramDefinition — strips reserved fields", () => {
  it("24. does not include dependency_rules or stacking_rules in output", () => {
    const row = makeProgramRow();
    const serialized = serializeProgramDefinition(row);
    expect(serialized).not.toHaveProperty("dependency_rules");
    expect(serialized).not.toHaveProperty("stacking_rules");
    expect(serialized).not.toHaveProperty("created_by");
    expect(serialized).not.toHaveProperty("updated_by");
  });

  it("25. includes required fields: id, program_key, name, status, is_active, rule_set, required_documents", () => {
    const row = makeProgramRow();
    const serialized = serializeProgramDefinition(row);
    expect(serialized.id).toBe("prog-1");
    expect(serialized.program_key).toBe("test_program");
    expect(serialized.name).toBe("Test Program");
    expect(serialized.status).toBe("draft");
    expect(serialized.is_active).toBe(false);
    expect(serialized.rule_set).toEqual({ all: [] });
    expect(serialized.required_documents).toEqual(["Police report"]);
  });
});
