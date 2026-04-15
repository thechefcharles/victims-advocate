/**
 * Domain 2.3 — CVC Form Processing: serializer tests.
 *
 * Covers items 28-32 from the test plan.
 *   - Runtime serializer: minimal generation readiness, no coordinates
 *   - Admin serializer: full template + fields + mappings + validation state
 *   - Output job status serializer: provider-safe, no failure_reason internals
 *   - Historical case re-renders use bound template version (preserved on job)
 *   - Serializers do NOT leak raw DB rows
 */

import { describe, it, expect } from "vitest";

import {
  serializeForAdmin,
  serializeForRuntime,
  serializeOutputJobStatus,
} from "@/lib/server/cvcForms/cvcFormSerializer";
import type {
  CvcFormTemplateRecord,
  CvcFormFieldRecord,
  FormAlignmentMappingRecord,
  OutputGenerationJobRecord,
} from "@/lib/server/cvcForms/cvcFormTypes";

function makeTemplate(overrides: Partial<CvcFormTemplateRecord> = {}): CvcFormTemplateRecord {
  return {
    id: "template-1",
    state_workflow_config_id: null,
    state_code: "IL",
    form_name: "IL CVC v1",
    template_id: "il_cvc",
    version_number: 1,
    status: "active",
    source_pdf_path: "public/pdf/il_cvc_application.pdf",
    seeded_from: "lib/pdfMaps/il_cvc_fieldMap.ts",
    published_at: "2026-04-08T00:00:00Z",
    deprecated_at: null,
    created_by: "admin-1",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

function makeField(
  overrides: Partial<CvcFormFieldRecord> = {},
): CvcFormFieldRecord {
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

function makeMapping(
  overrides: Partial<FormAlignmentMappingRecord> = {},
): FormAlignmentMappingRecord {
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
    status: "completed",
    generated_document_id: "doc-1",
    generation_metadata: { template_version: 1, warnings: ["soft warning"] },
    failure_reason: null,
    created_by: "provider-1",
    created_at: "2026-04-08T00:00:00Z",
    completed_at: "2026-04-08T00:00:01Z",
    ...overrides,
  };
}

describe("serializeForAdmin", () => {
  it("28a. includes full status + audit metadata + validation state", () => {
    const view = serializeForAdmin(
      makeTemplate(),
      [makeField()],
      [makeMapping()],
    );
    expect(view.status).toBe("active");
    expect(view.created_by).toBe("admin-1");
    expect(view.field_count).toBe(1);
    expect(view.mapping_count).toBe(1);
    expect(view.validation_state).toBe("complete");
    expect(view.fields[0]?.has_mapping).toBe(true);
  });

  it("28b. reports incomplete validation when required field has no mapping", () => {
    const view = serializeForAdmin(
      makeTemplate(),
      [makeField({ required: true })],
      [],
    );
    expect(view.validation_state).toBe("incomplete");
    expect(view.missing_fields).toContain("Victims Name");
    expect(view.fields[0]?.has_mapping).toBe(false);
  });
});

describe("serializeForRuntime", () => {
  it("29. minimal shape with no raw coordinates or admin metadata", () => {
    const view = serializeForRuntime(
      makeTemplate(),
      { ready: true, missingFields: [] },
    );
    expect(view.state_code).toBe("IL");
    expect(view.template_id).toBe("il_cvc");
    expect(view.template_uuid).toBe("template-1");
    expect(view.generation_readiness).toBe("ready");
    // No created_by, no fields[], no audit metadata
    expect(view).not.toHaveProperty("created_by");
    expect(view).not.toHaveProperty("fields");
    expect(view).not.toHaveProperty("status");
    expect(view).not.toHaveProperty("seeded_from");
  });

  it("reports missing required fields when readiness is false", () => {
    const view = serializeForRuntime(
      makeTemplate(),
      { ready: false, missingFields: ["Victims Name", "DOB"] },
    );
    expect(view.generation_readiness).toBe("missing_required_fields");
    expect(view.missing_required_fields).toEqual(["Victims Name", "DOB"]);
  });
});

describe("serializeOutputJobStatus", () => {
  it("30. provider-safe job view exposes status, document_id, template_version, sanitized warnings", () => {
    const view = serializeOutputJobStatus(makeJob());
    expect(view.job_id).toBe("job-1");
    expect(view.status).toBe("completed");
    expect(view.document_id).toBe("doc-1");
    expect(view.template_version).toBe(1);
    expect(view.warnings).toEqual(["soft warning"]);
  });

  it("31. does NOT expose failure_reason internal text", () => {
    const view = serializeOutputJobStatus(
      makeJob({
        status: "failed",
        failure_reason: "internal: pdf-lib threw at line 47",
        generated_document_id: null,
      }),
    );
    expect(view).not.toHaveProperty("failure_reason");
    expect(JSON.stringify(view)).not.toContain("internal: pdf-lib");
  });

  it("32. preserves the bound template version on the job (historical fidelity)", () => {
    const view = serializeOutputJobStatus(
      makeJob({
        cvc_form_template_id: "template-old",
        generation_metadata: { template_version: 3, warnings: [] },
      }),
    );
    expect(view.template_uuid).toBe("template-old");
    expect(view.template_version).toBe(3);
  });
});
