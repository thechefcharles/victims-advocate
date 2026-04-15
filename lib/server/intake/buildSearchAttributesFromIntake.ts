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
import {
  detectAnswerVersion,
  normalizeIntakeAnswers,
  getAnswerValue,
  type NormalizedAnswers,
} from "./intakeAnswerAdapter";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function asBoolean(v: unknown): boolean {
  return v === true;
}

function deriveUrgency(answers: NormalizedAnswers): "high" | "medium" | "low" {
  if (asBoolean(getAnswerValue(answers, "protection_and_civil_has_order_of_protection"))) {
    return "high";
  }
  const dateOfCrime = asString(getAnswerValue(answers, "crime_date_of_crime"));
  if (!dateOfCrime) return "low";
  const parsed = Date.parse(dateOfCrime);
  if (Number.isNaN(parsed)) return "low";
  const ageDays = (Date.now() - parsed) / MS_PER_DAY;
  if (ageDays < 30) return "high";
  if (ageDays <= 90) return "medium";
  return "low";
}

/**
 * Loss flags live as `losses_<key>` after normalization. We collect every
 * boolean answer key prefixed with `losses_` and re-emit it under the legacy
 * un-prefixed key so downstream `needs` consumers (matching) keep working.
 */
function deriveNeeds(answers: NormalizedAnswers): Record<string, boolean> {
  const needs: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (!key.startsWith("losses_")) continue;
    if (typeof value !== "boolean") continue;
    needs[key.slice("losses_".length)] = value;
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
  const version = detectAnswerVersion(payload);
  const answers = normalizeIntakeAnswers(payload, version);

  return {
    state: submission.state_code,
    county: asString(getAnswerValue(answers, "crime_crime_county")),
    language: asString(getAnswerValue(answers, "contact_preferred_language")),
    needs: deriveNeeds(answers),
    urgencyLevel: deriveUrgency(answers),
    advocateAssisted: asBoolean(getAnswerValue(answers, "contact_working_with_advocate")),
  };
}
