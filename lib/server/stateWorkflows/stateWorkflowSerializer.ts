/**
 * Domain 2.2 — State Workflows: serializers.
 *
 * Two views:
 *   - serializeForRuntime — safe subset for any authenticated consumer.
 *     Excludes created_by, audit fields, draft-only metadata.
 *   - serializeForAdmin — full admin metadata + validation state.
 */

import { validateConfigCompleteness } from "./configValidation";
import type {
  StateWorkflowConfigWithSets,
  RuntimeConfigView,
  AdminConfigView,
} from "./stateWorkflowTypes";

export function serializeForRuntime(
  wrapped: StateWorkflowConfigWithSets,
): RuntimeConfigView {
  const { config, intake_schema, eligibility_rule_set, document_requirement_set, output_mapping_set, form_template_set } =
    wrapped;
  return {
    id: config.id,
    state_code: config.state_code,
    version_number: config.version_number,
    display_name: config.display_name,
    intake_schema: intake_schema?.schema_payload ?? null,
    eligibility_rules: eligibility_rule_set?.rules_payload ?? null,
    document_requirements: document_requirement_set?.requirements_payload ?? null,
    output_mapping: output_mapping_set
      ? {
          template_id: output_mapping_set.template_id,
          field_metadata: output_mapping_set.field_metadata,
        }
      : null,
    form_template: form_template_set
      ? {
          template_id: form_template_set.template_id,
          field_metadata: form_template_set.field_metadata,
        }
      : null,
  };
}

export function serializeForAdmin(
  wrapped: StateWorkflowConfigWithSets,
): AdminConfigView {
  const validation = validateConfigCompleteness(wrapped);
  const { config } = wrapped;
  return {
    id: config.id,
    state_code: config.state_code,
    version_number: config.version_number,
    status: config.status,
    display_name: config.display_name,
    seeded_from: config.seeded_from,
    published_at: config.published_at,
    deprecated_at: config.deprecated_at,
    created_by: config.created_by,
    created_at: config.created_at,
    updated_at: config.updated_at,
    has_intake_schema: wrapped.intake_schema !== null,
    has_eligibility_rule_set: wrapped.eligibility_rule_set !== null,
    has_document_requirement_set: wrapped.document_requirement_set !== null,
    has_output_mapping_set: wrapped.output_mapping_set !== null,
    has_form_template_set: wrapped.form_template_set !== null,
    validation_state: validation.valid ? "complete" : "incomplete",
    missing_pieces: validation.missingPieces,
  };
}
