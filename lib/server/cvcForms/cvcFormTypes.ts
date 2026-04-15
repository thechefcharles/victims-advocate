/**
 * Domain 2.3 — CVC Form Processing & Alignment Engine: TypeScript types.
 *
 * Data class:
 *   cvc_form_templates / cvc_form_fields / form_alignment_mappings → Class C
 *   output_generation_jobs → Class B
 *
 * Raw DB shapes are *Record; surface-facing shapes are *View.
 * Never return a *Record directly from a route — always pass through a serializer.
 */

import type { CvcFormTemplateStatus, OutputGenerationJobStatus } from "@nxtstps/registry";
import type { LegacyIntakePayload } from "@/lib/archive/compensationSchema.legacy";

// ---------------------------------------------------------------------------
// DB row shapes
// ---------------------------------------------------------------------------

export type CvcFormTemplateRecord = {
  id: string;
  state_workflow_config_id: string | null;
  state_code: "IL" | "IN";
  form_name: string;
  template_id: string; // 'il_cvc' | 'in_cvc'
  version_number: number;
  status: CvcFormTemplateStatus;
  source_pdf_path: string | null;
  seeded_from: string | null;
  published_at: string | null;
  deprecated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CvcFormFieldType =
  | "text"
  | "textarea"
  | "checkbox"
  | "date"
  | "currency"
  | "signature"
  | "repeating_rows";

export type CvcFormFieldInputOption = { value: string; label: string };

export type CvcFormFieldConditional = {
  field_key: string;
  operator: "eq" | "neq" | "in" | "not_in";
  value: string | number | boolean | Array<string | number | boolean>;
};

export type CvcFormFieldValidationRules = {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
};

export type CvcFormFieldRecord = {
  id: string;
  template_id: string;
  field_key: string;
  label: string | null;
  field_type: CvcFormFieldType;
  page_number: number | null;
  x: number | null;
  y: number | null;
  font_size: number | null;
  required: boolean;
  source_path: string | null;
  // Renderer metadata (Domain 2.3 — 20260606000000_cvc_form_fields_renderer_meta).
  section_key: string | null;
  display_order: number | null;
  help_text: string | null;
  placeholder: string | null;
  input_options: CvcFormFieldInputOption[] | null;
  conditional_on: CvcFormFieldConditional | null;
  validation_rules: CvcFormFieldValidationRules | null;
  is_visible_to_applicant: boolean;
  is_readonly: boolean;
  created_at: string;
};

export type FormAlignmentMappingPurpose = "intake" | "eligibility" | "output" | "computed";

export type FormAlignmentMappingRecord = {
  id: string;
  template_id: string;
  cvc_form_field_id: string;
  canonical_field_key: string;
  intake_field_path: string | null;
  eligibility_field_key: string | null;
  mapping_purpose: FormAlignmentMappingPurpose;
  transform_type: string | null;
  transform_config: Record<string, unknown> | null;
  required: boolean;
  created_at: string;
};

export type OutputGenerationJobRecord = {
  id: string;
  case_id: string;
  cvc_form_template_id: string;
  state_code: "IL" | "IN";
  status: OutputGenerationJobStatus;
  generated_document_id: string | null;
  generation_metadata: Record<string, unknown>;
  failure_reason: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
};

// Re-export status enums for convenience.
export type { CvcFormTemplateStatus, OutputGenerationJobStatus };

// ---------------------------------------------------------------------------
// Service inputs
// ---------------------------------------------------------------------------

export type CreateCvcFormTemplateInput = {
  state_code: "IL" | "IN";
  form_name: string;
  template_id: string;
  source_pdf_path?: string | null;
  seeded_from?: string | null;
  state_workflow_config_id?: string | null;
};

export type UpdateCvcFormTemplateInput = {
  form_name?: string;
  source_pdf_path?: string | null;
};

export type CreateCvcFormFieldInput = {
  field_key: string;
  label?: string | null;
  field_type: CvcFormFieldType;
  page_number?: number | null;
  x?: number | null;
  y?: number | null;
  font_size?: number | null;
  required?: boolean;
  source_path?: string | null;
  // Optional renderer metadata.
  section_key?: string | null;
  display_order?: number | null;
  help_text?: string | null;
  placeholder?: string | null;
  input_options?: CvcFormFieldInputOption[] | null;
  conditional_on?: CvcFormFieldConditional | null;
  validation_rules?: CvcFormFieldValidationRules | null;
  is_visible_to_applicant?: boolean;
  is_readonly?: boolean;
};

export type CreateFormAlignmentMappingInput = {
  cvc_form_field_id: string;
  canonical_field_key: string;
  intake_field_path?: string | null;
  eligibility_field_key?: string | null;
  mapping_purpose: FormAlignmentMappingPurpose;
  transform_type?: string | null;
  transform_config?: Record<string, unknown> | null;
  required?: boolean;
};

// ---------------------------------------------------------------------------
// OutputPayload — runtime resolved data prepared for form rendering
// ---------------------------------------------------------------------------

/**
 * Result of resolveCanonicalOutputData(). Carries everything pdfRenderService
 * needs to fill the form. Not persisted today; recomputed on every generation.
 */
export type OutputPayload = {
  application: LegacyIntakePayload;
  /** Map from cvc_form_field.field_key → resolved string/boolean value. */
  resolvedFields: Record<string, string | boolean | null>;
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Serializer outputs
// ---------------------------------------------------------------------------

/** Full admin view of a template + its fields and mappings. */
export type AdminTemplateView = {
  id: string;
  state_code: "IL" | "IN";
  form_name: string;
  template_id: string;
  version_number: number;
  status: CvcFormTemplateStatus;
  source_pdf_path: string | null;
  seeded_from: string | null;
  published_at: string | null;
  deprecated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  field_count: number;
  mapping_count: number;
  validation_state: "complete" | "incomplete";
  missing_fields: string[];
  fields: Array<{
    id: string;
    field_key: string;
    label: string | null;
    field_type: CvcFormFieldType;
    required: boolean;
    has_mapping: boolean;
  }>;
};

/** Minimal runtime preview surface for providers. No coordinates. */
export type RuntimePreviewView = {
  state_code: "IL" | "IN";
  template_id: string;
  template_uuid: string;
  version_number: number;
  generation_readiness: "ready" | "missing_eligibility" | "missing_required_fields";
  missing_required_fields: string[];
  completeness_warning: string | null;
};

/** Provider-safe job status surface — no failure_reason internal text. */
export type OutputJobStatusView = {
  job_id: string;
  case_id: string;
  state_code: "IL" | "IN";
  status: OutputGenerationJobStatus;
  generated_at: string | null;
  document_id: string | null;
  template_uuid: string;
  template_version: number;
  /** Sanitized warning list — no system internals. */
  warnings: string[];
};
