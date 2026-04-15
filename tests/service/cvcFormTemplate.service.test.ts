/**
 * Domain 2.3 — CVC Form Processing: template lifecycle service tests.
 *
 * Scenarios:
 *   9. createCvcFormTemplate → status='draft', version_number incremented
 *  10. Draft template can be edited (updateCvcFormTemplate succeeds)
 *  11. Active template cannot be silently mutated (throws VALIDATION_ERROR)
 *  12. Deprecated template remains resolvable for historical generation
 *  13. Only one active template per state (verified via repository unique idx)
 *  14. activateCvcFormTemplate → status='active', published_at set
 *  15. deprecateCvcFormTemplate → status='deprecated', historical jobs unaffected
 *  16. activate validates alignment first; throws VALIDATION_ERROR if incomplete
 *  17. validateAlignment exposed as separate explicit admin call
 *  18. invalidateWorkflowDerivedData called on activate AND deprecate
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

vi.mock("@/lib/server/trustSignal", () => ({
  emitSignal: vi.fn().mockResolvedValue({ success: true, signalId: "sig-1" }),
}));

vi.mock("@/lib/server/stateWorkflows/invalidation", () => ({
  invalidateWorkflowDerivedData: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/cvcForms/cvcFormRepository", () => ({
  getCvcFormTemplateById: vi.fn(),
  getActiveCvcFormTemplate: vi.fn(),
  getMaxVersionNumberForState: vi.fn().mockResolvedValue(0),
  listCvcFormTemplates: vi.fn(),
  insertCvcFormTemplate: vi.fn(),
  updateCvcFormTemplateStatus: vi.fn(),
  updateCvcFormTemplateFields: vi.fn(),
  insertCvcFormField: vi.fn(),
  insertFormAlignmentMapping: vi.fn(),
  getCvcFormFieldsByTemplateId: vi.fn().mockResolvedValue([]),
  getAlignmentMappingsByTemplateId: vi.fn().mockResolvedValue([]),
  insertOutputGenerationJob: vi.fn(),
  updateOutputGenerationJobStatus: vi.fn(),
  getLatestOutputJobByCaseId: vi.fn(),
}));

import * as repo from "@/lib/server/cvcForms/cvcFormRepository";
import { transition } from "@/lib/server/workflow/engine";
import { can } from "@/lib/server/policy/policyEngine";
import { invalidateWorkflowDerivedData } from "@/lib/server/stateWorkflows/invalidation";
import type { AuthContext } from "@/lib/server/auth/context";
import type {
  CvcFormTemplateRecord,
  CvcFormFieldRecord,
  FormAlignmentMappingRecord,
} from "@/lib/server/cvcForms/cvcFormTypes";

function makeTemplate(
  overrides: Partial<CvcFormTemplateRecord> = {},
): CvcFormTemplateRecord {
  return {
    id: "template-1",
    state_workflow_config_id: null,
    state_code: "IL",
    form_name: "IL CVC v1",
    template_id: "il_cvc",
    version_number: 1,
    status: "draft",
    source_pdf_path: "public/pdf/il_cvc_application.pdf",
    seeded_from: null,
    published_at: null,
    deprecated_at: null,
    created_by: "admin-1",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

function makeField(overrides: Partial<CvcFormFieldRecord> = {}): CvcFormFieldRecord {
  return {
    id: "field-1",
    template_id: "template-1",
    field_key: "Victims Name",
    label: null,
    field_type: "text",
    page_number: null,
    x: null,
    y: null,
    font_size: null,
    required: true,
    source_path: "victim.firstName",
    section_key: null,
    display_order: null,
    help_text: null,
    placeholder: null,
    input_options: null,
    conditional_on: null,
    validation_rules: null,
    is_visible_to_applicant: true,
    is_readonly: false,
    created_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

function makeMapping(overrides: Partial<FormAlignmentMappingRecord> = {}): FormAlignmentMappingRecord {
  return {
    id: "mapping-1",
    template_id: "template-1",
    cvc_form_field_id: "field-1",
    canonical_field_key: "victim.firstName",
    intake_field_path: "victim.firstName",
    eligibility_field_key: null,
    mapping_purpose: "intake",
    transform_type: null,
    transform_config: null,
    required: true,
    created_at: "2026-04-01T00:00:00Z",
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

describe("cvcFormTemplateService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-establish sticky default impls that the module-level mock factory set.
    vi.mocked(can).mockResolvedValue({
      allowed: true,
      reason: "ALLOWED",
      auditRequired: true,
    });
    vi.mocked(transition).mockResolvedValue({
      success: true,
      transitionId: "txn-1",
      fromState: "draft",
      toState: "active",
    });
    vi.mocked(invalidateWorkflowDerivedData).mockResolvedValue(undefined);
    vi.mocked(repo.getMaxVersionNumberForState).mockResolvedValue(0);
    vi.mocked(repo.getCvcFormFieldsByTemplateId).mockResolvedValue([]);
    vi.mocked(repo.getAlignmentMappingsByTemplateId).mockResolvedValue([]);
  });

  it("9. createCvcFormTemplate increments version_number based on max", async () => {
    vi.mocked(repo.getMaxVersionNumberForState).mockResolvedValueOnce(2);
    vi.mocked(repo.insertCvcFormTemplate).mockResolvedValueOnce(
      makeTemplate({ version_number: 3 }),
    );

    const { createCvcFormTemplate } = await import(
      "@/lib/server/cvcForms/cvcFormTemplateService"
    );
    const result = await createCvcFormTemplate(
      adminCtx(),
      { state_code: "IL", form_name: "IL v3", template_id: "il_cvc" },
      fakeSupabase,
    );

    expect(repo.insertCvcFormTemplate).toHaveBeenCalledWith(
      fakeSupabase,
      expect.objectContaining({ version_number: 3 }),
    );
    expect(result.version_number).toBe(3);
    expect(result.status).toBe("draft");
  });

  it("10. updateCvcFormTemplate succeeds for a draft template", async () => {
    vi.mocked(repo.getCvcFormTemplateById).mockResolvedValueOnce(makeTemplate({ status: "draft" }));
    vi.mocked(repo.updateCvcFormTemplateFields).mockResolvedValueOnce(
      makeTemplate({ status: "draft", form_name: "Renamed" }),
    );

    const { updateCvcFormTemplate } = await import(
      "@/lib/server/cvcForms/cvcFormTemplateService"
    );
    const result = await updateCvcFormTemplate(
      adminCtx(),
      "template-1",
      { form_name: "Renamed" },
      fakeSupabase,
    );

    expect(repo.updateCvcFormTemplateFields).toHaveBeenCalled();
    expect(result.form_name).toBe("Renamed");
  });

  it("11. updateCvcFormTemplate refuses to mutate an active template", async () => {
    vi.mocked(repo.getCvcFormTemplateById).mockResolvedValueOnce(
      makeTemplate({ status: "active" }),
    );

    const { updateCvcFormTemplate } = await import(
      "@/lib/server/cvcForms/cvcFormTemplateService"
    );
    await expect(
      updateCvcFormTemplate(adminCtx(), "template-1", { form_name: "X" }, fakeSupabase),
    ).rejects.toThrow(/draft/);
  });

  it("14. activateCvcFormTemplate → status='active', published_at set, signal emitted", async () => {
    vi.mocked(repo.getCvcFormTemplateById).mockResolvedValueOnce(makeTemplate({ status: "draft" }));
    vi.mocked(repo.getCvcFormFieldsByTemplateId).mockResolvedValue([makeField()]);
    vi.mocked(repo.getAlignmentMappingsByTemplateId).mockResolvedValue([makeMapping()]);
    vi.mocked(repo.updateCvcFormTemplateStatus).mockResolvedValueOnce(
      makeTemplate({ status: "active", published_at: "2026-04-08T00:00:00Z" }),
    );

    const { activateCvcFormTemplate } = await import(
      "@/lib/server/cvcForms/cvcFormTemplateService"
    );
    const result = await activateCvcFormTemplate(adminCtx(), "template-1", fakeSupabase);

    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "cvc_form_template_status",
        toState: "active",
      }),
      fakeSupabase,
    );
    expect(invalidateWorkflowDerivedData).toHaveBeenCalledWith("IL", "template-1");
    expect(result.status).toBe("active");
  });

  it("16. activate validates alignment first; throws VALIDATION_ERROR if incomplete", async () => {
    vi.mocked(repo.getCvcFormTemplateById).mockResolvedValueOnce(makeTemplate({ status: "draft" }));
    // Required field exists but no mapping for it
    vi.mocked(repo.getCvcFormFieldsByTemplateId).mockResolvedValue([
      makeField({ required: true }),
    ]);
    vi.mocked(repo.getAlignmentMappingsByTemplateId).mockResolvedValue([]);

    const { activateCvcFormTemplate } = await import(
      "@/lib/server/cvcForms/cvcFormTemplateService"
    );
    await expect(
      activateCvcFormTemplate(adminCtx(), "template-1", fakeSupabase),
    ).rejects.toThrow(/missing alignment/);

    // transition() must NOT be called when validation fails
    expect(transition).not.toHaveBeenCalled();
  });

  it("15. deprecateCvcFormTemplate → status='deprecated', invalidation fired", async () => {
    vi.mocked(repo.getCvcFormTemplateById).mockResolvedValueOnce(
      makeTemplate({ status: "active" }),
    );
    vi.mocked(repo.updateCvcFormTemplateStatus).mockResolvedValueOnce(
      makeTemplate({ status: "deprecated", deprecated_at: "2026-04-09T00:00:00Z" }),
    );
    vi.mocked(repo.getCvcFormFieldsByTemplateId).mockResolvedValue([]);
    vi.mocked(repo.getAlignmentMappingsByTemplateId).mockResolvedValue([]);

    const { deprecateCvcFormTemplate } = await import(
      "@/lib/server/cvcForms/cvcFormTemplateService"
    );
    const result = await deprecateCvcFormTemplate(adminCtx(), "template-1", fakeSupabase);

    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "cvc_form_template_status",
        toState: "deprecated",
      }),
      fakeSupabase,
    );
    expect(invalidateWorkflowDerivedData).toHaveBeenCalledWith("IL", "template-1");
    expect(result.status).toBe("deprecated");
  });

  it("17. validateAlignment exposed as separate explicit admin call", async () => {
    vi.mocked(repo.getCvcFormTemplateById).mockResolvedValueOnce(makeTemplate({ status: "draft" }));
    vi.mocked(repo.getCvcFormFieldsByTemplateId).mockResolvedValue([
      makeField({ required: true }),
    ]);
    vi.mocked(repo.getAlignmentMappingsByTemplateId).mockResolvedValue([]);

    const { validateAlignment } = await import(
      "@/lib/server/cvcForms/cvcFormTemplateService"
    );
    const result = await validateAlignment(adminCtx(), "template-1", fakeSupabase);

    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain("Victims Name");
    // No transition call — preview only
    expect(transition).not.toHaveBeenCalled();
  });
});
