/**
 * Domain 2.1 — Intake: ApplicantSearchProfile mapper.
 *
 * Pure function. No side effects, no DB access, no network calls.
 *
 * SEARCH LAW (AGENTS.md Rule 12):
 *   - MUST NOT import from lib/server/search/searchService.ts
 *   - MUST NOT query the organizations table
 *   - MUST NOT touch provider_search_index
 *
 * The output ApplicantSearchProfile is the typed contract this module promises.
 * Downstream consumers (matching, search) read this profile — they do not
 * dig into the raw submitted_payload directly. This is what keeps Domain 2.1
 * decoupled from Domain 0.6 search infrastructure.
 *
 * urgencyLevel rules (Decision 4):
 *   - "high" if dateOfCrime within the last 30 days OR an order of protection is on file
 *   - "medium" if 30–90 days
 *   - "low" if older than 90 days OR the date is missing/unparseable
 *
 * safetyModeEnabled is intentionally OMITTED — it lives on AuthContext and
 * is applied at the matching layer, not as a search attribute.
 */

import type { IntakeSubmissionRecord, ApplicantSearchProfile } from "./intakeTypes";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function pickString(payload: Record<string, unknown>, path: string[]): string | null {
  let cursor: unknown = payload;
  for (const key of path) {
    if (!cursor || typeof cursor !== "object") return null;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  if (typeof cursor !== "string") return null;
  const trimmed = cursor.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pickBoolean(payload: Record<string, unknown>, path: string[]): boolean {
  let cursor: unknown = payload;
  for (const key of path) {
    if (!cursor || typeof cursor !== "object") return false;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return cursor === true;
}

function deriveUrgency(payload: Record<string, unknown>): "high" | "medium" | "low" {
  const hasOrderOfProtection = pickBoolean(payload, [
    "protectionAndCivil",
    "hasOrderOfProtection",
  ]);
  if (hasOrderOfProtection) return "high";

  const dateOfCrime = pickString(payload, ["crime", "dateOfCrime"]);
  if (!dateOfCrime) return "low";

  const parsed = Date.parse(dateOfCrime);
  if (Number.isNaN(parsed)) return "low";

  const ageDays = (Date.now() - parsed) / MS_PER_DAY;
  if (ageDays < 30) return "high";
  if (ageDays <= 90) return "medium";
  return "low";
}

function deriveNeeds(payload: Record<string, unknown>): Record<string, boolean> {
  const losses = (payload.losses ?? null) as Record<string, unknown> | null;
  if (!losses || typeof losses !== "object") return {};

  const needs: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(losses)) {
    // Only pass through boolean flags. Numeric loss amounts and free-text fields
    // are not part of the search profile (defer canonical service-tag enum to Domain 2.2).
    if (typeof value === "boolean") {
      needs[key] = value;
    }
  }
  return needs;
}

/**
 * Maps an immutable IntakeSubmissionRecord into the typed ApplicantSearchProfile.
 *
 * Callers (intakeService.submitIntake) should call this AFTER the submission row
 * has been persisted, and use the result to seed downstream search/matching
 * pipelines. The function never throws — missing fields fall back to safe defaults.
 */
export function buildSearchAttributesFromIntake(
  submission: IntakeSubmissionRecord,
): ApplicantSearchProfile {
  const payload = submission.submitted_payload ?? {};

  return {
    state: submission.state_code,
    county: pickString(payload, ["crime", "crimeCounty"]),
    language: pickString(payload, ["contact", "preferredLanguage"]),
    needs: deriveNeeds(payload),
    urgencyLevel: deriveUrgency(payload),
    advocateAssisted: pickBoolean(payload, ["contact", "workingWithAdvocate"]),
  };
}
