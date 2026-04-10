/**
 * Domain 2.2 — State Workflows: service + state/version tests.
 *
 * Covers items 9-28 from the test plan.
 *
 * Key invariants:
 *   - publishStateWorkflowConfig requires validateConfigCompleteness() = true
 *   - publish goes through transition() (Rule 16 — Transition Law)
 *   - publish + deprecate both invoke invalidateWorkflowDerivedData()
 *   - resolveActiveStateWorkflowConfig returns the highest version with status='active'
 *   - resolveActiveIntakeSchema chains config → schema lookup
 *   - validateConfigCompleteness flags missing required pieces
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/policy/policyEngine", () => ({
  can: vi.fn().mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: true }),
}));

vi.mock("@/lib/server/workflow/engine", () => ({
  transition: vi.fn().mockResolvedValue({
    success: true,
    transitionId: "txn-1",
    fromState: "draft",
    toState: "active",
  }),
}));

vi.mock("@/lib/server/stateWorkflows/stateWorkflowRepository", () => ({
  getConfigById: vi.fn(),
  getActiveConfigByStateCode: vi.fn(),
  getMaxVersionForState: vi.fn().mockResolvedValue(0),
  listConfigs: vi.fn(),
  insertConfig: vi.fn(),
  updateConfigStatus: vi.fn(),
  updateConfigFields: vi.fn(),
  getConfigWithSets: vi.fn(),
  getIntakeSchemaByConfigId: vi.fn(),
  getEligibilityRuleSetByConfigId: vi.fn(),
  getDocumentRequirementSetByConfigId: vi.fn(),
  listTranslationMappingSetsByConfigId: vi.fn().mockResolvedValue([]),
  getOutputMappingSetByConfigId: vi.fn(),
  getFormTemplateSetByConfigId: vi.fn(),
  getDisclaimerSetByConfigId: vi.fn().mockResolvedValue(null),
  insertIntakeSchema: vi.fn(),
  insertEligibilityRuleSet: vi.fn(),
  insertDocumentRequirementSet: vi.fn(),
  insertTranslationMappingSet: vi.fn(),
  insertOutputMappingSet: vi.fn(),
  insertFormTemplateSet: vi.fn(),
  insertDisclaimerSet: vi.fn(),
}));

vi.mock("@/lib/server/stateWorkflows/invalidation", () => ({
  invalidateWorkflowDerivedData: vi.fn().mockResolvedValue(undefined),
  registerInvalidationHandler: vi.fn(),
}));

import * as repo from "@/lib/server/stateWorkflows/stateWorkflowRepository";
import { transition } from "@/lib/server/workflow/engine";
import { invalidateWorkflowDerivedData } from "@/lib/server/stateWorkflows/invalidation";
import { validateConfigCompleteness } from "@/lib/server/stateWorkflows/configValidation";
import { resolveActiveIntakeSchema } from "@/lib/server/stateWorkflows/resolvers";
import type { AuthContext } from "@/lib/server/auth/context";
import type {
  StateWorkflowConfigRecord,
  StateWorkflowConfigWithSets,
  IntakeSchemaRecord,
} from "@/lib/server/stateWorkflows/stateWorkflowTypes";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<StateWorkflowConfigRecord> = {}): StateWorkflowConfigRecord {
  return {
    id: "config-1",
    state_code: "IL",
    version_number: 1,
    status: "draft",
    display_name: "IL v1",
    seeded_from: "test",
    published_at: null,
    deprecated_at: null,
    created_by: "admin-1",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

function makeWrapped(
  overrides: Partial<StateWorkflowConfigWithSets> = {},
): StateWorkflowConfigWithSets {
  return {
    config: makeConfig(),
    intake_schema: {
      id: "is-1",
      config_id: "config-1",
      schema_payload: { steps: [] },
      created_at: "2026-04-01T00:00:00Z",
    },
    eligibility_rule_set: {
      id: "es-1",
      config_id: "config-1",
      rules_payload: { questions: [] },
      created_at: "2026-04-01T00:00:00Z",
    },
    document_requirement_set: {
      id: "dr-1",
      config_id: "config-1",
      requirements_payload: { required_categories: [] },
      created_at: "2026-04-01T00:00:00Z",
    },
    translation_mapping_sets: [],
    output_mapping_set: {
      id: "om-1",
      config_id: "config-1",
      template_id: "il_cvc",
      field_metadata: [],
      created_at: "2026-04-01T00:00:00Z",
    },
    form_template_set: {
      id: "ft-1",
      config_id: "config-1",
      template_id: "il_cvc",
      field_metadata: [],
      created_at: "2026-04-01T00:00:00Z",
    },
    disclaimer_set: null,
    ...overrides,
  };
}

function adminCtx(): AuthContext {
  return {
    user: { id: "admin-1", email: "admin@nxtstps.com" },
    userId: "admin-1",
    role: "platform_admin",
    orgId: null,
    orgRole: null,
    affiliatedCatalogEntryId: null,
    organizationCatalogEntryId: null,
    isAdmin: true,
    emailVerified: true,
    accountStatus: "active",
    accountType: "platform_admin",
    safetyModeEnabled: false,
  } as unknown as AuthContext;
}

const fakeSupabase = {} as unknown as import("@supabase/supabase-js").SupabaseClient;

// ---------------------------------------------------------------------------
// validateConfigCompleteness — pure function
// ---------------------------------------------------------------------------

describe("validateConfigCompleteness", () => {
  it("returns valid=true when all four required pieces are present", () => {
    const result = validateConfigCompleteness(makeWrapped());
    expect(result.valid).toBe(true);
    expect(result.missingPieces).toEqual([]);
  });

  it("returns valid=false with missing pieces list when intake_schema absent", () => {
    const result = validateConfigCompleteness(makeWrapped({ intake_schema: null }));
    expect(result.valid).toBe(false);
    expect(result.missingPieces).toContain("intake_schema");
  });

  it("returns valid=false when output_mapping_set absent", () => {
    const result = validateConfigCompleteness(makeWrapped({ output_mapping_set: null }));
    expect(result.valid).toBe(false);
    expect(result.missingPieces).toContain("output_mapping_set");
  });

  it("does NOT require translation_mapping_sets, form_template_set, or disclaimer_set", () => {
    const result = validateConfigCompleteness(
      makeWrapped({
        translation_mapping_sets: [],
        form_template_set: null,
        disclaimer_set: null,
      }),
    );
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// stateWorkflowService — mutations
// ---------------------------------------------------------------------------

describe("stateWorkflowService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createStateWorkflowConfig increments version_number based on max", async () => {
    vi.mocked(repo.getMaxVersionForState).mockResolvedValueOnce(3);
    vi.mocked(repo.insertConfig).mockResolvedValueOnce(makeConfig({ version_number: 4 }));
    vi.mocked(repo.getConfigWithSets).mockResolvedValueOnce(
      makeWrapped({ config: makeConfig({ version_number: 4 }) }),
    );

    const { createStateWorkflowConfig } = await import(
      "@/lib/server/stateWorkflows/stateWorkflowService"
    );
    const result = await createStateWorkflowConfig(
      adminCtx(),
      { state_code: "IL", display_name: "IL v4" },
      fakeSupabase,
    );

    expect(repo.insertConfig).toHaveBeenCalledWith(
      fakeSupabase,
      expect.objectContaining({ version_number: 4 }),
    );
    expect(result.version_number).toBe(4);
  });

  it("publishStateWorkflowConfig calls transition() and invalidateWorkflowDerivedData()", async () => {
    vi.mocked(repo.getConfigWithSets)
      .mockResolvedValueOnce(makeWrapped()) // initial load (with sets)
      .mockResolvedValueOnce(
        makeWrapped({ config: makeConfig({ status: "active", published_at: "2026-04-08T00:00:00Z" }) }),
      ); // post-publish reload
    vi.mocked(repo.updateConfigStatus).mockResolvedValueOnce(
      makeConfig({ status: "active", published_at: "2026-04-08T00:00:00Z" }),
    );

    const { publishStateWorkflowConfig } = await import(
      "@/lib/server/stateWorkflows/stateWorkflowService"
    );
    const result = await publishStateWorkflowConfig(adminCtx(), "config-1", fakeSupabase);

    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "state_workflow_config_status",
        toState: "active",
      }),
      fakeSupabase,
    );
    expect(invalidateWorkflowDerivedData).toHaveBeenCalledWith("IL", "config-1");
    expect(result.status).toBe("active");
  });

  it("publishStateWorkflowConfig throws VALIDATION_ERROR when config is incomplete", async () => {
    vi.mocked(repo.getConfigWithSets).mockResolvedValueOnce(
      makeWrapped({ intake_schema: null, output_mapping_set: null }),
    );

    const { publishStateWorkflowConfig } = await import(
      "@/lib/server/stateWorkflows/stateWorkflowService"
    );

    await expect(
      publishStateWorkflowConfig(adminCtx(), "config-1", fakeSupabase),
    ).rejects.toThrow(/missing required pieces/);

    // transition() must NOT be called when validation fails
    expect(transition).not.toHaveBeenCalled();
  });

  it("publishStateWorkflowConfig propagates STATE_INVALID from the workflow engine", async () => {
    vi.mocked(repo.getConfigWithSets).mockResolvedValueOnce(makeWrapped());
    vi.mocked(transition).mockResolvedValueOnce({
      success: false,
      fromState: "deprecated",
      toState: "active",
      reason: "STATE_INVALID",
    });

    const { publishStateWorkflowConfig } = await import(
      "@/lib/server/stateWorkflows/stateWorkflowService"
    );

    await expect(
      publishStateWorkflowConfig(adminCtx(), "config-1", fakeSupabase),
    ).rejects.toThrow(/STATE_INVALID/);
  });

  it("deprecateStateWorkflowConfig transitions active → deprecated and triggers invalidation", async () => {
    vi.mocked(repo.getConfigById).mockResolvedValueOnce(makeConfig({ status: "active" }));
    vi.mocked(repo.updateConfigStatus).mockResolvedValueOnce(
      makeConfig({ status: "deprecated", deprecated_at: "2026-04-09T00:00:00Z" }),
    );
    vi.mocked(repo.getConfigWithSets).mockResolvedValueOnce(
      makeWrapped({ config: makeConfig({ status: "deprecated" }) }),
    );

    const { deprecateStateWorkflowConfig } = await import(
      "@/lib/server/stateWorkflows/stateWorkflowService"
    );
    const result = await deprecateStateWorkflowConfig(adminCtx(), "config-1", fakeSupabase);

    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "state_workflow_config_status",
        toState: "deprecated",
      }),
      fakeSupabase,
    );
    expect(invalidateWorkflowDerivedData).toHaveBeenCalledWith("IL", "config-1");
    expect(result.status).toBe("deprecated");
  });

  it("updateStateWorkflowConfig refuses to mutate a non-draft config", async () => {
    vi.mocked(repo.getConfigById).mockResolvedValueOnce(makeConfig({ status: "active" }));

    const { updateStateWorkflowConfig } = await import(
      "@/lib/server/stateWorkflows/stateWorkflowService"
    );
    await expect(
      updateStateWorkflowConfig(adminCtx(), "config-1", { display_name: "X" }, fakeSupabase),
    ).rejects.toThrow(/draft/);
  });

  it("updateStateWorkflowConfig succeeds for a draft config", async () => {
    vi.mocked(repo.getConfigById).mockResolvedValueOnce(makeConfig({ status: "draft" }));
    vi.mocked(repo.updateConfigFields).mockResolvedValueOnce(
      makeConfig({ status: "draft", display_name: "Renamed" }),
    );
    vi.mocked(repo.getConfigWithSets).mockResolvedValueOnce(
      makeWrapped({ config: makeConfig({ display_name: "Renamed" }) }),
    );

    const { updateStateWorkflowConfig } = await import(
      "@/lib/server/stateWorkflows/stateWorkflowService"
    );
    const result = await updateStateWorkflowConfig(
      adminCtx(),
      "config-1",
      { display_name: "Renamed" },
      fakeSupabase,
    );

    expect(repo.updateConfigFields).toHaveBeenCalledWith(
      fakeSupabase,
      "config-1",
      { display_name: "Renamed" },
    );
    expect(result.display_name).toBe("Renamed");
  });

  it("getActiveStateWorkflowConfig returns null when no active config exists", async () => {
    vi.mocked(repo.listConfigs).mockResolvedValueOnce([]);

    const { getActiveStateWorkflowConfig } = await import(
      "@/lib/server/stateWorkflows/stateWorkflowService"
    );
    const result = await getActiveStateWorkflowConfig(adminCtx(), "IL", fakeSupabase);
    expect(result).toBeNull();
  });

  it("getActiveStateWorkflowConfig returns serializeForRuntime view when found", async () => {
    vi.mocked(repo.listConfigs).mockResolvedValueOnce([makeConfig({ status: "active" })]);
    vi.mocked(repo.getConfigWithSets).mockResolvedValueOnce(
      makeWrapped({ config: makeConfig({ status: "active" }) }),
    );

    const { getActiveStateWorkflowConfig } = await import(
      "@/lib/server/stateWorkflows/stateWorkflowService"
    );
    const result = await getActiveStateWorkflowConfig(adminCtx(), "IL", fakeSupabase);
    expect(result).not.toBeNull();
    // RuntimeConfigView excludes admin-only fields
    expect(result).not.toHaveProperty("created_by");
    expect(result).not.toHaveProperty("status");
    expect(result?.state_code).toBe("IL");
  });

  it("listStateWorkflowConfigs hydrates each row with sets and serializes for admin", async () => {
    vi.mocked(repo.listConfigs).mockResolvedValueOnce([
      makeConfig({ status: "draft" }),
      makeConfig({ id: "config-2", status: "active" }),
    ]);
    vi.mocked(repo.getConfigWithSets)
      .mockResolvedValueOnce(makeWrapped())
      .mockResolvedValueOnce(makeWrapped({ config: makeConfig({ id: "config-2", status: "active" }) }));

    const { listStateWorkflowConfigs } = await import(
      "@/lib/server/stateWorkflows/stateWorkflowService"
    );
    const result = await listStateWorkflowConfigs(adminCtx(), {}, fakeSupabase);
    expect(result).toHaveLength(2);
    expect(result[0]?.status).toBe("draft");
    expect(result[1]?.status).toBe("active");
  });
});

// ---------------------------------------------------------------------------
// Resolvers — version preservation
// ---------------------------------------------------------------------------

describe("resolvers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolveActiveIntakeSchema returns null when no active config exists", async () => {
    vi.mocked(repo.getActiveConfigByStateCode).mockResolvedValueOnce(null);

    const result = await resolveActiveIntakeSchema(fakeSupabase, "IL");
    expect(result).toBeNull();
  });

  it("resolveActiveIntakeSchema chains active config → intake_schema lookup", async () => {
    vi.mocked(repo.getActiveConfigByStateCode).mockResolvedValueOnce(makeConfig({ status: "active" }));
    const schemaRow: IntakeSchemaRecord = {
      id: "is-1",
      config_id: "config-1",
      schema_payload: { hello: "world" },
      created_at: "2026-04-01T00:00:00Z",
    };
    vi.mocked(repo.getIntakeSchemaByConfigId).mockResolvedValueOnce(schemaRow);

    const result = await resolveActiveIntakeSchema(fakeSupabase, "IL");
    expect(result?.schema_payload).toEqual({ hello: "world" });
  });

  it("resolveIntakeSchema with explicit configId preserves historical version context", async () => {
    const oldConfig = makeConfig({ id: "config-old", status: "deprecated", version_number: 1 });
    const oldSchema: IntakeSchemaRecord = {
      id: "is-old",
      config_id: "config-old",
      schema_payload: { version: "old" },
      created_at: "2025-01-01T00:00:00Z",
    };
    vi.mocked(repo.getConfigById).mockResolvedValueOnce(oldConfig);
    vi.mocked(repo.getIntakeSchemaByConfigId).mockResolvedValueOnce(oldSchema);

    const { resolveIntakeSchema } = await import("@/lib/server/stateWorkflows/resolvers");
    const result = await resolveIntakeSchema(fakeSupabase, "IL", "config-old");
    expect(result?.schema_payload).toEqual({ version: "old" });
  });
});
