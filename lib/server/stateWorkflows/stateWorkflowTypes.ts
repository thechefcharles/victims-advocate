/**
 * Domain 2.2 — State Workflows: TypeScript types.
 *
 * Data class: Class C — Controlled Business (config / non-PII).
 * Raw DB shapes are *Record; surface-facing shapes are *View variants.
 * Never return a *Record directly from a route — always pass through a serializer.
 */

import type { StateWorkflowConfigStatus } from "@nxtstps/registry";

// ---------------------------------------------------------------------------
// DB row shapes
// ---------------------------------------------------------------------------

export type StateWorkflowConfigRecord = {
  id: string;
  state_code: "IL" | "IN";
  version_number: number;
  status: StateWorkflowConfigStatus;
  display_name: string;
  seeded_from: string | null;
  published_at: string | null;
  deprecated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type IntakeSchemaRecord = {
  id: string;
  config_id: string;
  schema_payload: Record<string, unknown>;
  created_at: string;
};

export type EligibilityRuleSetRecord = {
  id: string;
  config_id: string;
  rules_payload: Record<string, unknown>;
  created_at: string;
};

export type DocumentRequirementSetRecord = {
  id: string;
  config_id: string;
  requirements_payload: Record<string, unknown>;
  created_at: string;
};

export type TranslationMappingSetRecord = {
  id: string;
  config_id: string;
  locale: string;
  mappings_payload: Record<string, unknown>;
  created_at: string;
};

export type OutputMappingSetRecord = {
  id: string;
  config_id: string;
  template_id: string;
  field_metadata: FormFieldMetadata[];
  created_at: string;
};

export type FormTemplateSetRecord = {
  id: string;
  config_id: string;
  template_id: string;
  field_metadata: FormFieldMetadata[];
  created_at: string;
};

export type DisclaimerSetRecord = {
  id: string;
  config_id: string;
  disclaimers_payload: unknown[];
  created_at: string;
};

/**
 * Single field metadata entry stored in form_template_sets.field_metadata
 * and output_mapping_sets.field_metadata. Function bodies are NEVER stored —
 * only the source path string. Runtime resolution maps the path to the
 * existing in-code helpers (lib/pdfMaps/il_cvc_fieldMap.ts, in_cvc_coords.ts).
 */
export type FormFieldMetadata = {
  fieldId: string;
  label?: string;
  page?: number;
  x?: number;
  y?: number;
  type?: "text" | "checkbox" | "date" | "phone";
  sourcePath: string;
};

// ---------------------------------------------------------------------------
// Aggregated read shapes
// ---------------------------------------------------------------------------

/** A config plus all its child sets — the unit of resolution and validation. */
export type StateWorkflowConfigWithSets = {
  config: StateWorkflowConfigRecord;
  intake_schema: IntakeSchemaRecord | null;
  eligibility_rule_set: EligibilityRuleSetRecord | null;
  document_requirement_set: DocumentRequirementSetRecord | null;
  translation_mapping_sets: TranslationMappingSetRecord[];
  output_mapping_set: OutputMappingSetRecord | null;
  form_template_set: FormTemplateSetRecord | null;
  disclaimer_set: DisclaimerSetRecord | null;
};

// ---------------------------------------------------------------------------
// Service inputs
// ---------------------------------------------------------------------------

export type CreateStateWorkflowConfigInput = {
  state_code: "IL" | "IN";
  display_name: string;
  seeded_from?: string | null;
};

export type UpdateStateWorkflowConfigInput = {
  display_name?: string;
};

// ---------------------------------------------------------------------------
// Serializer outputs
// ---------------------------------------------------------------------------

/** Safe subset for non-admin runtime consumers. No created_by/audit fields. */
export type RuntimeConfigView = {
  id: string;
  state_code: "IL" | "IN";
  version_number: number;
  display_name: string;
  intake_schema: Record<string, unknown> | null;
  eligibility_rules: Record<string, unknown> | null;
  document_requirements: Record<string, unknown> | null;
  output_mapping: {
    template_id: string;
    field_metadata: FormFieldMetadata[];
  } | null;
  form_template: {
    template_id: string;
    field_metadata: FormFieldMetadata[];
  } | null;
};

/** Full admin view including version control + audit metadata. */
export type AdminConfigView = {
  id: string;
  state_code: "IL" | "IN";
  version_number: number;
  status: StateWorkflowConfigStatus;
  display_name: string;
  seeded_from: string | null;
  published_at: string | null;
  deprecated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  has_intake_schema: boolean;
  has_eligibility_rule_set: boolean;
  has_document_requirement_set: boolean;
  has_output_mapping_set: boolean;
  has_form_template_set: boolean;
  validation_state: "complete" | "incomplete";
  missing_pieces: string[];
};

// Re-export the status enum for convenience.
export type { StateWorkflowConfigStatus };
