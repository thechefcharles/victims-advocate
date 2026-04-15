/**
 * Domain 1.2 — Case: state machine definition and helpers.
 *
 * Mirrors the case_status block in lib/server/workflow/transitions.ts.
 * The shared transition engine remains the authoritative validator — never skip it.
 */

import type { CaseStatus } from "@nxtstps/registry";

// ---------------------------------------------------------------------------
// Terminal states
// ---------------------------------------------------------------------------

/** Terminal states — no further transitions possible. */
export const CASE_TERMINAL_STATES: CaseStatus[] = ["approved", "denied", "closed"];

/** States from which the applicant can drive actions (appeal_start). */
export const CASE_APPLICANT_ACTIONABLE: CaseStatus[] = ["denied"];

// ---------------------------------------------------------------------------
// Transition graph (mirrors workflow/transitions.ts case_status block)
// ---------------------------------------------------------------------------

export const CASE_TRANSITIONS: Array<[CaseStatus, CaseStatus]> = [
  ["open", "assigned"],
  ["assigned", "in_progress"],
  ["in_progress", "awaiting_applicant"],
  ["awaiting_applicant", "in_progress"],
  ["awaiting_provider", "in_progress"],
  ["in_progress", "ready_for_submission"],
  ["awaiting_applicant", "ready_for_submission"],
  ["awaiting_provider", "ready_for_submission"],
  ["ready_for_submission", "submitted"],
  ["submitted", "under_review"],
  ["under_review", "approved"],
  ["under_review", "denied"],
  ["approved", "closed"],
  ["denied", "closed"],
  ["denied", "appeal_in_progress"],
  ["appeal_in_progress", "closed"],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if fromState → toState is a valid edge in the case graph. */
export function isValidCaseTransition(from: CaseStatus, to: CaseStatus): boolean {
  return CASE_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

/** Returns true if the given status is terminal. */
export function isCaseTerminal(status: CaseStatus): boolean {
  return CASE_TERMINAL_STATES.includes(status);
}
