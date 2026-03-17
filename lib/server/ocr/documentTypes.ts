/**
 * Phase 13: Document type hints for extraction (user-selected + optional inferred).
 */

/** User-facing doc_type values that may be set on documents. */
export const DOC_TYPE_LABELS: Record<string, string> = {
  police_report: "Police report",
  medical_bills: "Medical / billing records",
  proof_of_loss: "Proof of loss",
  other: "Other",
};

/** Inferred type from filename or OCR patterns (simple keywords). */
export function inferDocTypeFromText(text: string, fileName: string): string | null {
  const lower = (text + " " + fileName).toLowerCase();
  if (/\b(police|report\s*#|case\s*number|incident\s*report|reporting\s*agency)\b/.test(lower))
    return "police_report";
  if (/\b(medical|hospital|bill|provider|charge|amount\s*due|statement)\b/.test(lower))
    return "medical_bills";
  if (/\b(proof|loss|claim|receipt)\b/.test(lower)) return "proof_of_loss";
  return null;
}
