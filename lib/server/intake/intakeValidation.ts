/**
 * Domain 2.1 — Intake: server-side validation.
 *
 * The client validators in lib/intake/* drive the UI. These functions are the
 * server-authoritative versions used inside intakeService at submit time and
 * by per-step preview endpoints.
 *
 * fieldConfig.ts is imported as the canonical skip/defer sensitivity map
 * (Decision 3 — non-mutating import). It is the single source of truth for
 * which fields may be skipped or deferred.
 */

import { canSkip, canDefer, isHighSensitivity } from "@/lib/intake/fieldConfig";
import type { IntakeSessionRecord } from "./intakeTypes";

// ---------------------------------------------------------------------------
// Step keys recognized by the server validator.
// These mirror the legacy intake page step keys but the server enforces a
// minimum readiness contract independent of UI step ordering.
// ---------------------------------------------------------------------------

export const REQUIRED_STEP_KEYS = [
  "victim",
  "applicant",
  "crime",
  "contact",
  "losses",
  "protectionAndCivil",
] as const;

export type IntakeStepKey = (typeof REQUIRED_STEP_KEYS)[number];

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

// ---------------------------------------------------------------------------
// Per-step validator
// ---------------------------------------------------------------------------

/**
 * Validates the per-step payload submitted by the client.
 *
 * The implementation deliberately keeps the rules lightweight in v1: it
 * enforces presence of required keys and respects the canonical skip/defer
 * config. Detailed field-level rules continue to live in lib/intake/* for
 * the legacy page; this is a defense-in-depth check at the server boundary.
 */
export function validateIntakeStep(
  _sessionId: string,
  stepKey: string,
  stepData: Record<string, unknown> | null | undefined,
): ValidationResult {
  const errors: string[] = [];

  if (!stepData || typeof stepData !== "object") {
    return { valid: false, errors: [`Step '${stepKey}' payload missing or not an object.`] };
  }

  // Step-specific required field hints. Server-side enforcement is intentionally
  // narrow — full schemas live in lib/compensationSchema.ts (Base Truth, untouched).
  const requiredByStep: Record<string, string[]> = {
    victim: ["firstName", "lastName"],
    applicant: ["isSameAsVictim"],
    crime: ["dateOfCrime"],
    contact: ["preferredLanguage"],
    losses: [],
    protectionAndCivil: [],
  };

  const required = requiredByStep[stepKey] ?? [];
  for (const key of required) {
    const fullKey = `${stepKey}.${key}`;
    const value = (stepData as Record<string, unknown>)[key];
    const present = value !== undefined && value !== null && value !== "";

    if (present) continue;

    // Allow skip/defer if the canonical config permits it.
    if (canSkip(fullKey) || canDefer(fullKey)) {
      // Skipped fields are tracked client-side via fieldState; treat as valid here.
      continue;
    }

    errors.push(`Required field '${fullKey}' is missing.`);
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Submission readiness
// ---------------------------------------------------------------------------

/**
 * Checks whether a session's draft_payload is ready for submission.
 *
 * Returns missingSteps for any step whose top-level key is absent. This is
 * intentionally a coarse check — the full per-field gating remains in
 * lib/intake/stepCompleteness.ts (untouched, used by the legacy page).
 */
export function validateSubmissionReadiness(
  session: IntakeSessionRecord,
): { ready: boolean; missingSteps: string[] } {
  const payload = session.draft_payload ?? {};
  const missingSteps: string[] = [];

  for (const step of REQUIRED_STEP_KEYS) {
    const stepData = (payload as Record<string, unknown>)[step];
    if (!stepData || typeof stepData !== "object") {
      missingSteps.push(step);
      continue;
    }
    const result = validateIntakeStep(session.id, step, stepData as Record<string, unknown>);
    if (!result.valid) missingSteps.push(step);
  }

  return { ready: missingSteps.length === 0, missingSteps };
}

// Re-export the canonical helpers so callers do not bypass fieldConfig.
export { canSkip, canDefer, isHighSensitivity };
