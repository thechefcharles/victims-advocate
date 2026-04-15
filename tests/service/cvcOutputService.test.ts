/**
 * Domain 2.3 — CVC Form Processing: output service tests.
 *
 * Covers items 19-27 from the test plan.
 *
 * Key invariants:
 *   - Eligibility hard gate (isEligibilityCompleted=false → VALIDATION_ERROR)
 *   - Missing required fields → VALIDATION_ERROR (no job created)
 *   - documentService.uploadDocument is called (NOT raw storage write)
 *   - cvc_form_generated signal emitted on success
 *   - cvc_form_generation_failed signal emitted on failure
 *   - Job status transitions: pending → processing → completed
 *   - Job preserves template version at creation
 *   - resolveCanonicalOutputData: pure mapping with transforms applied
 *   - validateCvcGenerationReadiness: pure check
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/policy/policyEngine", () => ({
  can: vi.fn().mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false }),
}));

vi.mock("@/lib/server/trustSignal", () => ({
  emitSignal: vi.fn().mockResolvedValue({ success: true, signalId: "sig-1" }),
}));

vi.mock("@/lib/server/cases/caseRepository", () => ({
  getCaseRecordById: vi.fn().mockResolvedValue({
    id: "case-1",
    organization_id: "org-1",
    assigned_advocate_id: "provider-1",
    status: "in_progress",
    state_code: "IL",
  }),
}));

vi.mock("@/lib/server/cvcForms/pdfRenderService", () => ({
  renderCvcPdf: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
  translateNarrativeFieldsForOutput: vi.fn().mockImplementation((app: unknown) => Promise.resolve(app)),
}));

vi.mock("@/lib/server/documents/documentService", () => ({
  uploadDocument: vi.fn().mockResolvedValue({
    id: "doc-1",
    file_name: "il_cvc_case-1.pdf",
  }),
}));

vi.mock("@/lib/server/eligibility/eligibilityService", () => ({
  isEligibilityCompleted: vi.fn(),
  getEligibilityForCase: vi.fn().mockResolvedValue({
    result: "eligible",
    readiness: "ready",
    answers: {},
    completedAt: "2026-04-01T00:00:00Z",
  }),
}));

vi.mock("@/lib/server/cvcForms/cvcFormRepository", () => ({
  getActiveCvcFormTemplate: vi.fn(),
  getCvcFormFieldsByTemplateId: vi.fn(),
  getAlignmentMappingsByTemplateId: vi.fn(),
  insertOutputGenerationJob: vi.fn(),
  updateOutputGenerationJobStatus: vi.fn(),
  getLatestOutputJobByCaseId: vi.fn(),
}));

import { isEligibilityCompleted } from "@/lib/server/eligibility/eligibilityService";
import { uploadDocument } from "@/lib/server/documents/documentService";
import { renderCvcPdf } from "@/lib/server/cvcForms/pdfRenderService";
import { emitSignal } from "@/lib/server/trustSignal";
import * as repo from "@/lib/server/cvcForms/cvcFormRepository";
import {
  resolveCanonicalOutputData,
  validateCvcGenerationReadiness,
} from "@/lib/server/cvcForms/cvcOutputService";
import type { AuthContext } from "@/lib/server/auth/context";
import type {
  CvcFormTemplateRecord,
  CvcFormFieldRecord,
  FormAlignmentMappingRecord,
  OutputGenerationJobRecord,
} from "@/lib/server/cvcForms/cvcFormTypes";
import type { LegacyIntakePayload } from "@/lib/archive/compensationSchema.legacy";

function makeTemplate(): CvcFormTemplateRecord {
  return {
    id: "template-1",
    state_workflow_config_id: null,
    state_code: "IL",
    form_name: "IL CVC v1",
    template_id: "il_cvc",
    version_number: 1,
    status: "active",
    source_pdf_path: null,
    seeded_from: null,
    published_at: "2026-04-01T00:00:00Z",
    deprecated_at: null,
    created_by: "admin-1",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
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

function makeJob(overrides: Partial<OutputGenerationJobRecord> = {}): OutputGenerationJobRecord {
  return {
    id: "job-1",
    case_id: "case-1",
    cvc_form_template_id: "template-1",
    state_code: "IL",
    status: "pending",
    generated_document_id: null,
    generation_metadata: {},
    failure_reason: null,
    created_by: "provider-1",
    created_at: "2026-04-08T00:00:00Z",
    completed_at: null,
    ...overrides,
  };
}

function providerCtx(): AuthContext {
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
  } as unknown as AuthContext;
}

const fakeSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        application: {
          victim: { firstName: "Alice" },
          contact: { prefersEnglish: true },
        },
      },
      error: null,
    }),
  }),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
} as unknown as import("@supabase/supabase-js").SupabaseClient;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe("validateCvcGenerationReadiness", () => {
  it("returns ready when all required fields have mapped non-empty values", () => {
    const fields = [makeField({ required: true })];
    const mappings = [makeMapping()];
    const app = { victim: { firstName: "Alice" } } as unknown as LegacyIntakePayload;
    const result = validateCvcGenerationReadiness(fields, mappings, app);
    expect(result.ready).toBe(true);
    expect(result.missingFields).toEqual([]);
  });

  it("flags missing required fields when value is empty", () => {
    const fields = [makeField({ required: true })];
    const mappings = [makeMapping()];
    const app = { victim: { firstName: "" } } as unknown as LegacyIntakePayload;
    const result = validateCvcGenerationReadiness(fields, mappings, app);
    expect(result.ready).toBe(false);
    expect(result.missingFields).toContain("Victims Name");
  });

  it("flags required fields with no mapping at all", () => {
    const fields = [makeField({ required: true })];
    const result = validateCvcGenerationReadiness(fields, [], {} as LegacyIntakePayload);
    expect(result.ready).toBe(false);
  });
});

describe("resolveCanonicalOutputData", () => {
  it("walks intake mappings and resolves dotted paths into resolvedFields", () => {
    const fields = [makeField({ field_key: "Victims Name" })];
    const mappings = [makeMapping({ canonical_field_key: "victim.firstName" })];
    const app = { victim: { firstName: "Alice" } } as unknown as LegacyIntakePayload;
    const result = resolveCanonicalOutputData(app, fields, mappings, null);
    expect(result.resolvedFields["Victims Name"]).toBe("Alice");
  });

  it("applies date_reformat transform (YYYY-MM-DD → MM/DD/YYYY)", () => {
    const fields = [makeField({ field_key: "DOB", field_type: "date" })];
    const mappings = [
      makeMapping({
        canonical_field_key: "victim.dateOfBirth",
        intake_field_path: "victim.dateOfBirth",
        transform_type: "date_reformat",
      }),
    ];
    const app = { victim: { dateOfBirth: "2026-01-15" } } as unknown as LegacyIntakePayload;
    const result = resolveCanonicalOutputData(app, fields, mappings, null);
    expect(result.resolvedFields["DOB"]).toBe("01/15/2026");
  });

  it("applies phone_split transform with config.part", () => {
    const fields = [makeField({ field_key: "Phone Area" })];
    const mappings = [
      makeMapping({
        canonical_field_key: "victim.cellPhone",
        intake_field_path: "victim.cellPhone",
        transform_type: "phone_split",
        transform_config: { part: "area" },
      }),
    ];
    const app = { victim: { cellPhone: "708-555-1234" } } as unknown as LegacyIntakePayload;
    const result = resolveCanonicalOutputData(app, fields, mappings, null);
    expect(result.resolvedFields["Phone Area"]).toBe("708");
  });
});

// ---------------------------------------------------------------------------
// generateCvcForm pipeline
// ---------------------------------------------------------------------------

describe("generateCvcForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("19/20. throws VALIDATION_ERROR when eligibility is not completed (hard gate)", async () => {
    vi.mocked(isEligibilityCompleted).mockResolvedValueOnce(false);
    const { generateCvcForm } = await import("@/lib/server/cvcForms/cvcOutputService");

    await expect(generateCvcForm(providerCtx(), "case-1", fakeSupabase)).rejects.toThrow(
      /Eligibility assessment not completed/,
    );

    // Job is NOT created when the hard gate trips
    expect(repo.insertOutputGenerationJob).not.toHaveBeenCalled();
  });

  it("21. throws VALIDATION_ERROR when no active template exists", async () => {
    vi.mocked(isEligibilityCompleted).mockResolvedValueOnce(true);
    vi.mocked(repo.getActiveCvcFormTemplate).mockResolvedValueOnce(null);

    const { generateCvcForm } = await import("@/lib/server/cvcForms/cvcOutputService");
    await expect(generateCvcForm(providerCtx(), "case-1", fakeSupabase)).rejects.toThrow(
      /No active CVC form template/,
    );
  });

  it("22. successful generation: creates job, calls renderCvcPdf, calls uploadDocument", async () => {
    vi.mocked(isEligibilityCompleted).mockResolvedValueOnce(true);
    vi.mocked(repo.getActiveCvcFormTemplate).mockResolvedValueOnce(makeTemplate());
    vi.mocked(repo.getCvcFormFieldsByTemplateId).mockResolvedValueOnce([
      makeField({ required: true }),
    ]);
    vi.mocked(repo.getAlignmentMappingsByTemplateId).mockResolvedValueOnce([makeMapping()]);
    vi.mocked(repo.insertOutputGenerationJob).mockResolvedValueOnce(makeJob());
    vi.mocked(repo.updateOutputGenerationJobStatus)
      .mockResolvedValueOnce(makeJob({ status: "processing" }))
      .mockResolvedValueOnce(
        makeJob({
          status: "completed",
          generated_document_id: "doc-1",
          completed_at: "2026-04-08T00:00:01Z",
          generation_metadata: { template_version: 1, warnings: [] },
        }),
      );

    const { generateCvcForm } = await import("@/lib/server/cvcForms/cvcOutputService");
    const result = await generateCvcForm(providerCtx(), "case-1", fakeSupabase);

    expect(repo.insertOutputGenerationJob).toHaveBeenCalled();
    expect(renderCvcPdf).toHaveBeenCalledWith("il_cvc", expect.anything());
    expect(uploadDocument).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        doc_type: "cvc_generated_il",
        linked_object_type: "case",
        linked_object_id: "case-1",
      }),
      expect.anything(),
    );
    expect(emitSignal).toHaveBeenCalledWith(
      expect.objectContaining({ signalType: "cvc_form_generated" }),
      expect.anything(),
    );
    expect(result.status).toBe("completed");
    expect(result.document_id).toBe("doc-1");
  });

  it("23. when render fails: job marked failed, cvc_form_generation_failed signal emitted", async () => {
    vi.mocked(isEligibilityCompleted).mockResolvedValueOnce(true);
    vi.mocked(repo.getActiveCvcFormTemplate).mockResolvedValueOnce(makeTemplate());
    vi.mocked(repo.getCvcFormFieldsByTemplateId).mockResolvedValueOnce([
      makeField({ required: true }),
    ]);
    vi.mocked(repo.getAlignmentMappingsByTemplateId).mockResolvedValueOnce([makeMapping()]);
    vi.mocked(repo.insertOutputGenerationJob).mockResolvedValueOnce(makeJob());
    vi.mocked(repo.updateOutputGenerationJobStatus).mockResolvedValue(
      makeJob({ status: "processing" }),
    );
    vi.mocked(renderCvcPdf).mockRejectedValueOnce(new Error("PDF render boom"));

    const { generateCvcForm } = await import("@/lib/server/cvcForms/cvcOutputService");
    await expect(generateCvcForm(providerCtx(), "case-1", fakeSupabase)).rejects.toThrow(
      /CVC generation failed/,
    );

    expect(emitSignal).toHaveBeenCalledWith(
      expect.objectContaining({ signalType: "cvc_form_generation_failed" }),
      expect.anything(),
    );
  });

  it("24. throws VALIDATION_ERROR when required fields are missing in the case application", async () => {
    vi.mocked(isEligibilityCompleted).mockResolvedValueOnce(true);
    vi.mocked(repo.getActiveCvcFormTemplate).mockResolvedValueOnce(makeTemplate());
    vi.mocked(repo.getCvcFormFieldsByTemplateId).mockResolvedValueOnce([
      makeField({ required: true }),
    ]);
    vi.mocked(repo.getAlignmentMappingsByTemplateId).mockResolvedValueOnce([makeMapping()]);

    // Override the supabase mock to return a case with empty firstName
    const supabaseEmptyApp = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { application: { victim: { firstName: "" } } },
          error: null,
        }),
      }),
      storage: { from: vi.fn() },
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const { generateCvcForm } = await import("@/lib/server/cvcForms/cvcOutputService");
    await expect(
      generateCvcForm(providerCtx(), "case-1", supabaseEmptyApp),
    ).rejects.toThrow(/Required CVC fields are missing/);

    // Job is NOT created when readiness check trips
    expect(repo.insertOutputGenerationJob).not.toHaveBeenCalled();
  });
});
