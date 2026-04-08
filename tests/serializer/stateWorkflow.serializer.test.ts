/**
 * Domain 2.2 — State Workflows: serializer + invalidation hook tests.
 *
 * Covers items 29-34 from the test plan.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

import {
  serializeForRuntime,
  serializeForAdmin,
} from "@/lib/server/stateWorkflows/stateWorkflowSerializer";
import {
  invalidateWorkflowDerivedData,
  registerInvalidationHandler,
  _resetInvalidationHandlersForTesting,
} from "@/lib/server/stateWorkflows/invalidation";
import type {
  StateWorkflowConfigRecord,
  StateWorkflowConfigWithSets,
} from "@/lib/server/stateWorkflows/stateWorkflowTypes";

function makeConfig(overrides: Partial<StateWorkflowConfigRecord> = {}): StateWorkflowConfigRecord {
  return {
    id: "config-1",
    state_code: "IL",
    version_number: 1,
    status: "active",
    display_name: "IL v1",
    seeded_from: "test",
    published_at: "2026-04-08T00:00:00Z",
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
      schema_payload: { steps: [{ stepKey: "victim", fieldPaths: ["victim.firstName"] }] },
      created_at: "2026-04-01T00:00:00Z",
    },
    eligibility_rule_set: {
      id: "es-1",
      config_id: "config-1",
      rules_payload: { questions: ["q1"] },
      created_at: "2026-04-01T00:00:00Z",
    },
    document_requirement_set: {
      id: "dr-1",
      config_id: "config-1",
      requirements_payload: { required_categories: ["police_report"] },
      created_at: "2026-04-01T00:00:00Z",
    },
    translation_mapping_sets: [],
    output_mapping_set: {
      id: "om-1",
      config_id: "config-1",
      template_id: "il_cvc",
      field_metadata: [{ fieldId: "victim.firstName", sourcePath: "victim.firstName" }],
      created_at: "2026-04-01T00:00:00Z",
    },
    form_template_set: {
      id: "ft-1",
      config_id: "config-1",
      template_id: "il_cvc",
      field_metadata: [{ fieldId: "victim.firstName", sourcePath: "victim.firstName" }],
      created_at: "2026-04-01T00:00:00Z",
    },
    disclaimer_set: null,
    ...overrides,
  };
}

describe("serializeForRuntime", () => {
  it("excludes admin-only metadata (created_by, status, audit timestamps)", () => {
    const view = serializeForRuntime(makeWrapped());
    expect(view).not.toHaveProperty("created_by");
    expect(view).not.toHaveProperty("status");
    expect(view).not.toHaveProperty("seeded_from");
    expect(view).not.toHaveProperty("published_at");
    expect(view).not.toHaveProperty("deprecated_at");
  });

  it("preserves intake schema, eligibility, doc requirements, output, and form template payloads", () => {
    const view = serializeForRuntime(makeWrapped());
    expect(view.intake_schema).toEqual({
      steps: [{ stepKey: "victim", fieldPaths: ["victim.firstName"] }],
    });
    expect(view.eligibility_rules).toEqual({ questions: ["q1"] });
    expect(view.document_requirements).toEqual({ required_categories: ["police_report"] });
    expect(view.output_mapping?.template_id).toBe("il_cvc");
    expect(view.form_template?.field_metadata).toHaveLength(1);
  });

  it("returns null payloads when child sets are missing (resilient resolver)", () => {
    const view = serializeForRuntime(
      makeWrapped({
        intake_schema: null,
        eligibility_rule_set: null,
        document_requirement_set: null,
        output_mapping_set: null,
        form_template_set: null,
      }),
    );
    expect(view.intake_schema).toBeNull();
    expect(view.eligibility_rules).toBeNull();
    expect(view.document_requirements).toBeNull();
    expect(view.output_mapping).toBeNull();
    expect(view.form_template).toBeNull();
  });
});

describe("serializeForAdmin", () => {
  it("includes status + audit metadata + validation_state for a complete config", () => {
    const view = serializeForAdmin(makeWrapped());
    expect(view.status).toBe("active");
    expect(view.created_by).toBe("admin-1");
    expect(view.published_at).toBe("2026-04-08T00:00:00Z");
    expect(view.validation_state).toBe("complete");
    expect(view.missing_pieces).toEqual([]);
    expect(view.has_intake_schema).toBe(true);
    expect(view.has_output_mapping_set).toBe(true);
  });

  it("reports validation_state=incomplete with missing pieces when sets are absent", () => {
    const view = serializeForAdmin(
      makeWrapped({
        intake_schema: null,
        document_requirement_set: null,
      }),
    );
    expect(view.validation_state).toBe("incomplete");
    expect(view.missing_pieces).toContain("intake_schema");
    expect(view.missing_pieces).toContain("document_requirement_set");
    expect(view.has_intake_schema).toBe(false);
    expect(view.has_document_requirement_set).toBe(false);
  });
});

describe("invalidateWorkflowDerivedData", () => {
  beforeEach(() => {
    _resetInvalidationHandlersForTesting();
  });

  it("emits a no-op log call when no handlers are registered", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await invalidateWorkflowDerivedData("IL", "config-1");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("invalidateWorkflowDerivedData(IL, config-1)"),
    );
    warnSpy.mockRestore();
  });

  it("invokes every registered handler with stateCode and configId", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const handlerA = vi.fn().mockResolvedValue(undefined);
    const handlerB = vi.fn().mockResolvedValue(undefined);
    registerInvalidationHandler(handlerA);
    registerInvalidationHandler(handlerB);

    await invalidateWorkflowDerivedData("IN", "config-2");

    expect(handlerA).toHaveBeenCalledWith("IN", "config-2");
    expect(handlerB).toHaveBeenCalledWith("IN", "config-2");
    warnSpy.mockRestore();
  });

  it("does not propagate handler failures (logs and continues)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failingHandler = vi.fn().mockRejectedValue(new Error("boom"));
    const successHandler = vi.fn().mockResolvedValue(undefined);
    registerInvalidationHandler(failingHandler);
    registerInvalidationHandler(successHandler);

    await expect(invalidateWorkflowDerivedData("IL", "config-1")).resolves.toBeUndefined();
    expect(successHandler).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
