/**
 * Domain 2.3 — CVC Form Processing: alignment validation.
 *
 * Pure function. No DB access by design — caller pre-fetches fields and mappings.
 *
 * Called by:
 *   - cvcFormTemplateService.activateCvcFormTemplate (hard gate before publish)
 *   - cvcFormTemplateService.validateAlignment (explicit admin preview)
 *
 * "Complete" requires every required cvc_form_field to have at least one
 * form_alignment_mapping. Non-required fields can be unmapped without
 * blocking activation.
 */

import type {
  CvcFormFieldRecord,
  FormAlignmentMappingRecord,
} from "./cvcFormTypes";

export type AlignmentValidationResult = {
  valid: boolean;
  missingFields: string[];
};

export function validateFormAlignmentCompleteness(
  fields: CvcFormFieldRecord[],
  mappings: FormAlignmentMappingRecord[],
): AlignmentValidationResult {
  // Build a set of field ids that have at least one mapping.
  const mappedFieldIds = new Set<string>();
  for (const m of mappings) mappedFieldIds.add(m.cvc_form_field_id);

  const missing: string[] = [];
  for (const field of fields) {
    if (!field.required) continue;
    if (!mappedFieldIds.has(field.id)) {
      missing.push(field.field_key);
    }
  }

  return { valid: missing.length === 0, missingFields: missing };
}
