/**
 * Domain 1.3 — Messaging thread state machine.
 *
 * Maps CaseStatus → MessageThreadStatus so the thread's status stays
 * in sync with the case lifecycle without a second DB write at every
 * case transition. Callers read the thread status from this derivation
 * rather than trusting the stored value alone.
 *
 * Active states   — messaging is open and both parties can send.
 * Read-only states — thread exists but only reads are permitted (no new sends).
 * Archived states  — thread is fully archived; no sends or edits.
 */

import type { CaseStatus, MessageThreadStatus } from "@nxtstps/registry";

/** Case states where the messaging thread is fully active. */
export const CASE_STATES_MESSAGING_ACTIVE = new Set<CaseStatus>([
  "open",
  "assigned",
  "in_progress",
  "awaiting_applicant",
  "awaiting_provider",
  "ready_for_submission",
]);

/** Case states where the thread exists but is read-only. */
export const CASE_STATES_MESSAGING_READ_ONLY = new Set<CaseStatus>([
  "submitted",
  "under_review",
  "appeal_in_progress",
]);

/** Case states where the thread is archived. */
export const CASE_STATES_MESSAGING_ARCHIVED = new Set<CaseStatus>([
  "approved",
  "denied",
  "closed",
]);

/**
 * Derives the effective thread status from the parent case status.
 *
 * The stored thread.status may lag behind the case status during transitions.
 * Always call this at read time and pass the result as resource.status into
 * the policy engine — do not rely on the stored thread.status alone.
 */
export function deriveThreadStatusFromCaseStatus(
  caseStatus: CaseStatus,
): MessageThreadStatus {
  if (CASE_STATES_MESSAGING_ACTIVE.has(caseStatus)) return "active";
  if (CASE_STATES_MESSAGING_READ_ONLY.has(caseStatus)) return "read_only";
  return "archived";
}
