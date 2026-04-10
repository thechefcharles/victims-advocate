/**
 * Domain 2.3 — CVC Form Processing: serializers.
 *
 * Three views:
 *   - serializeForAdmin       — full template + fields + mappings + validation state
 *   - serializeForRuntime     — minimal generation-readiness for provider preview
 *   - serializeOutputJobStatus — provider-safe job status (no internal failure text)
 *
 * Never return raw *Record types from a route — always serialize first.
 */

import { validateFormAlignmentCompleteness } from "./configValidation";
import type {
  CvcFormTemplateRecord,
  CvcFormFieldRecord,
  FormAlignmentMappingRecord,
  OutputGenerationJobRecord,
  AdminTemplateView,
  RuntimePreviewView,
  OutputJobStatusView,
} from "./cvcFormTypes";

export function serializeForAdmin(
  template: CvcFormTemplateRecord,
  fields: CvcFormFieldRecord[],
  mappings: FormAlignmentMappingRecord[],
): AdminTemplateView {
  const validation = validateFormAlignmentCompleteness(fields, mappings);
  const mappedFieldIds = new Set<string>();
  for (const m of mappings) mappedFieldIds.add(m.cvc_form_field_id);

  return {
    id: template.id,
    state_code: template.state_code,
    form_name: template.form_name,
    template_id: template.template_id,
    version_number: template.version_number,
    status: template.status,
    source_pdf_path: template.source_pdf_path,
    seeded_from: template.seeded_from,
    published_at: template.published_at,
    deprecated_at: template.deprecated_at,
    created_by: template.created_by,
    created_at: template.created_at,
    updated_at: template.updated_at,
    field_count: fields.length,
    mapping_count: mappings.length,
    validation_state: validation.valid ? "complete" : "incomplete",
    missing_fields: validation.missingFields,
    fields: fields.map((f) => ({
      id: f.id,
      field_key: f.field_key,
      label: f.label,
      field_type: f.field_type,
      required: f.required,
      has_mapping: mappedFieldIds.has(f.id),
    })),
  };
}

export function serializeForRuntime(
  template: CvcFormTemplateRecord,
  readiness: { ready: boolean; missingFields: string[] },
  completenessWarning: string | null = null,
): RuntimePreviewView {
  return {
    state_code: template.state_code,
    template_id: template.template_id,
    template_uuid: template.id,
    version_number: template.version_number,
    generation_readiness: readiness.ready ? "ready" : "missing_required_fields",
    missing_required_fields: readiness.missingFields,
    completeness_warning: completenessWarning,
  };
}

export function serializeOutputJobStatus(
  job: OutputGenerationJobRecord,
): OutputJobStatusView {
  // Sanitize warnings list — only pull from generation_metadata.warnings,
  // never expose failure_reason internal text.
  const warnings: string[] = [];
  const meta = job.generation_metadata ?? {};
  const rawWarnings = (meta as { warnings?: unknown }).warnings;
  if (Array.isArray(rawWarnings)) {
    for (const w of rawWarnings) if (typeof w === "string") warnings.push(w);
  }

  return {
    job_id: job.id,
    case_id: job.case_id,
    state_code: job.state_code,
    status: job.status,
    generated_at: job.completed_at,
    document_id: job.generated_document_id,
    template_uuid: job.cvc_form_template_id,
    template_version:
      typeof (meta as { template_version?: unknown }).template_version === "number"
        ? ((meta as { template_version: number }).template_version)
        : 0,
    warnings,
  };
}
