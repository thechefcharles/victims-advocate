/**
 * Intake-v2 completion engine.
 *
 * Pure functions — no server-only deps, safe to import from client components
 * for live progress indicators. Operates on the RenderSection shape produced
 * by templateFieldsService and the flat {field_key: value} answers map from
 * intake_v2_sessions.
 *
 * Rules:
 * - "filled" = non-null, non-undefined, non-empty-string, and not === false
 *   (the last one matters for required checkboxes where `false` means unchecked).
 * - A section is `isComplete` when every required field is filled. Non-required
 *   fields never block completion regardless of value.
 * - Required fields hidden by an unsatisfied conditional_on rule do NOT count
 *   toward totalRequired — they can't be filled until their gate opens, so
 *   counting them would trap the user.
 */

import type { RenderField, RenderSection } from "@/components/intake-v2/types";
import { evaluateConditional } from "@/components/intake-v2/conditionalEval";

export interface FieldCompletion {
  fieldKey: string;
  label: string;
  required: boolean;
  filled: boolean;
}

export interface SectionCompletion {
  sectionKey: string;
  sectionTitle: string;
  totalRequired: number;
  filledRequired: number;
  isComplete: boolean;
  missingFields: FieldCompletion[];
}

export interface IntakeCompletion {
  sections: SectionCompletion[];
  totalRequired: number;
  totalFilledRequired: number;
  isReadyToSubmit: boolean;
  percentComplete: number;
}

export function isFieldFilled(field: RenderField, value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") {
    // For required checkboxes (e.g. certification agreements), false = unchecked
    // = not filled. For a regular boolean answer, only `true` counts as filled.
    return value === true;
  }
  if (Array.isArray(value)) {
    // A repeating_rows value is an array of row objects. The RepeatingRowField
    // pads up to minRows with empty row objects, so length > 0 is not enough
    // to consider it filled — require at least one row with at least one
    // non-empty cell.
    if (field.fieldType === "repeating_rows") {
      return value.some((row) => {
        if (!row || typeof row !== "object") return false;
        return Object.values(row as Record<string, unknown>).some(
          (v) => typeof v === "string" && v.trim().length > 0,
        );
      });
    }
    return value.length > 0;
  }
  return true;
}

function fieldIsVisible(
  field: RenderField,
  answers: Record<string, unknown>,
): boolean {
  return evaluateConditional(field.conditionalOn, answers);
}

export function computeSectionCompletion(
  section: RenderSection,
  answers: Record<string, unknown>,
): SectionCompletion {
  let totalRequired = 0;
  let filledRequired = 0;
  const missingFields: FieldCompletion[] = [];

  for (const field of section.fields) {
    if (!fieldIsVisible(field, answers)) continue;
    const filled = isFieldFilled(field, answers[field.fieldKey]);
    if (!field.required) continue;
    totalRequired += 1;
    if (filled) {
      filledRequired += 1;
    } else {
      missingFields.push({
        fieldKey: field.fieldKey,
        label: field.label,
        required: true,
        filled: false,
      });
    }
  }

  return {
    sectionKey: section.sectionKey,
    sectionTitle: section.sectionTitle,
    totalRequired,
    filledRequired,
    isComplete: totalRequired === 0 ? true : filledRequired === totalRequired,
    missingFields,
  };
}

export function computeIntakeCompletion(
  sections: RenderSection[],
  answers: Record<string, unknown>,
): IntakeCompletion {
  const sectionResults = sections.map((s) => computeSectionCompletion(s, answers));
  const totalRequired = sectionResults.reduce((sum, s) => sum + s.totalRequired, 0);
  const totalFilledRequired = sectionResults.reduce(
    (sum, s) => sum + s.filledRequired,
    0,
  );
  const percentComplete =
    totalRequired === 0 ? 100 : Math.round((totalFilledRequired / totalRequired) * 100);
  return {
    sections: sectionResults,
    totalRequired,
    totalFilledRequired,
    isReadyToSubmit: sectionResults.every((s) => s.isComplete),
    percentComplete,
  };
}
