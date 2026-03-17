/**
 * Phase 8: Compute review-step status: missing, skipped, deferred per field.
 */

import { getFieldState, type StoredApplication, type FieldStatus } from "./fieldState";

/** Core required fields for "complete intake" (v1). Others can be optional or deferred. */
export const REQUIRED_FIELD_KEYS = [
  "victim.firstName",
  "victim.lastName",
  "victim.dateOfBirth",
  "victim.streetAddress",
  "victim.city",
  "victim.state",
  "victim.zip",
  "victim.cellPhone",
  "applicant.isSameAsVictim",
  "crime.dateOfCrime",
  "crime.dateReported",
  "crime.crimeAddress",
  "crime.crimeCity",
  "crime.crimeCounty",
  "crime.reportingAgency",
  "crime.crimeDescription",
  "crime.injuryDescription",
  "crime.offenderKnown",
] as const;

function getNested(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const p of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[p];
  }
  return current;
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export type ReviewItem = { fieldKey: string; status: FieldStatus | "unanswered"; stepHint: string };

export type ReviewStatusResult = {
  missing: ReviewItem[];
  skipped: ReviewItem[];
  deferred: ReviewItem[];
  /** All required fields with their status for display. */
  required: ReviewItem[];
  /** Can mark intake "complete" if core required are answered or explicitly skipped/deferred. */
  canComplete: boolean;
};

const STEP_BY_PREFIX: Record<string, string> = {
  victim: "victim",
  applicant: "applicant",
  crime: "crime",
  losses: "losses",
  medical: "medical",
  employment: "employment",
  funeral: "funeral",
  documents: "documents",
  summary: "summary",
};

function stepHint(fieldKey: string): string {
  const prefix = fieldKey.split(".")[0] ?? "";
  return STEP_BY_PREFIX[prefix] ?? "victim";
}

/**
 * Compute review status from stored application (with _fieldState).
 */
export function getReviewStatus(app: StoredApplication): ReviewStatusResult {
  const clean = { ...app };
  delete (clean as Record<string, unknown>)["_fieldState"];
  const missing: ReviewItem[] = [];
  const skipped: ReviewItem[] = [];
  const deferred: ReviewItem[] = [];
  const required: ReviewItem[] = [];

  for (const fieldKey of REQUIRED_FIELD_KEYS) {
    const value = getNested(clean as Record<string, unknown>, fieldKey);
    const entry = getFieldState(app, fieldKey);
    const status: FieldStatus | "unanswered" = entry
      ? entry.status
      : isEmpty(value)
        ? "unanswered"
        : "answered";
    const item: ReviewItem = { fieldKey, status, stepHint: stepHint(fieldKey) };
    required.push(item);
    if (status === "unanswered") missing.push(item);
    else if (status === "skipped") skipped.push(item);
    else if (status === "deferred") deferred.push(item);
  }

  const canComplete = missing.length === 0;
  return { missing, skipped, deferred, required, canComplete };
}
