/**
 * Domain 2.2 — State Workflows: config completeness validation.
 *
 * Pure function. No DB access, no side effects, no logging.
 *
 * Called by intakeService publishStateWorkflowConfig BEFORE the status
 * transition. If the result is invalid, the publish is rejected with
 * VALIDATION_ERROR — the transition never happens.
 *
 * "Complete" requires all four mandatory pieces:
 *   - intake_schema       — step/field structure
 *   - eligibility_rule_set — decision tree
 *   - document_requirement_set — required-doc catalog
 *   - output_mapping_set  — output (PDF) field mapping
 *
 * Optional pieces (do NOT block publish): translation_mapping_sets, disclaimer_set,
 * form_template_set (form templates can lag behind output mappings).
 */

import type { StateWorkflowConfigWithSets } from "./stateWorkflowTypes";

export type ConfigValidationResult = {
  valid: boolean;
  missingPieces: string[];
};

export function validateConfigCompleteness(
  config: StateWorkflowConfigWithSets,
): ConfigValidationResult {
  const missing: string[] = [];

  if (!config.intake_schema) missing.push("intake_schema");
  if (!config.eligibility_rule_set) missing.push("eligibility_rule_set");
  if (!config.document_requirement_set) missing.push("document_requirement_set");
  if (!config.output_mapping_set) missing.push("output_mapping_set");

  return { valid: missing.length === 0, missingPieces: missing };
}
