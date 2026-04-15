/**
 * Domain 1.1 — SupportRequest: state machine definition and helpers.
 *
 * This module is the domain-level declaration of the state graph. It mirrors
 * what is registered in lib/server/workflow/transitions.ts so that service-layer
 * code can perform lightweight checks without calling the engine.
 *
 * The shared transition engine (lib/server/workflow/engine.ts) remains the
 * authoritative validator — never skip it for actual status changes.
 */

import type { SupportRequestStatus } from "@nxtstps/registry";

// ---------------------------------------------------------------------------
// Terminal and active status sets
// ---------------------------------------------------------------------------

/**
 * States from which no further transitions are possible (except → closed).
 * A request in one of these states is "inactive" for one-active-request purposes.
 */
export const SUPPORT_REQUEST_TERMINAL_STATES: SupportRequestStatus[] = [
  "declined",
  "transferred",
  "withdrawn",
  "closed",
];

/**
 * States that count as "active" for the one-active-request constraint.
 * Active = NOT in terminal states.
 */
export const SUPPORT_REQUEST_ACTIVE_STATUSES: SupportRequestStatus[] = [
  "draft",
  "submitted",
  "pending_review",
  "accepted",
];

// ---------------------------------------------------------------------------
// Transition graph (mirrors workflow/transitions.ts support_request block)
// ---------------------------------------------------------------------------

/** Canonical from→to edges for support_request. */
export const SUPPORT_REQUEST_TRANSITIONS: Array<[SupportRequestStatus, SupportRequestStatus]> = [
  ["draft", "submitted"],
  ["submitted", "pending_review"],
  ["pending_review", "accepted"],
  ["pending_review", "declined"],
  ["pending_review", "transferred"],
  ["draft", "withdrawn"],
  ["submitted", "withdrawn"],
  ["accepted", "closed"],
  ["declined", "closed"],
  ["transferred", "closed"],
  ["withdrawn", "closed"],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if fromState → toState is a valid edge in the support_request graph.
 * Lightweight domain check — does not call the workflow engine.
 */
export function isValidSupportRequestTransition(
  from: SupportRequestStatus,
  to: SupportRequestStatus,
): boolean {
  return SUPPORT_REQUEST_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

/**
 * Returns true if the given status is terminal (no further applicant-driven actions).
 */
export function isSupportRequestTerminal(status: SupportRequestStatus): boolean {
  return SUPPORT_REQUEST_TERMINAL_STATES.includes(status);
}

/**
 * Returns true if the given status counts as "active" for the one-active-request rule.
 */
export function isSupportRequestActive(status: SupportRequestStatus): boolean {
  return SUPPORT_REQUEST_ACTIVE_STATUSES.includes(status);
}
