/**
 * Domain 0.4 — Workflow State Infrastructure: valid transition graphs.
 *
 * VALID_TRANSITIONS maps each WorkflowEntityType to its allowed edges as
 * [fromState, toState] pairs. This is the single source of truth for what
 * state changes are permitted. Any transition not listed here will be
 * rejected by transition() with reason STATE_INVALID.
 *
 * Adding a new transition: append a [from, to] pair to the relevant array.
 * Adding a new entity type: add a key here and a case in WorkflowEntityType.
 */

import type { WorkflowEntityType } from "./types";

/**
 * Canonical state graphs per entity type.
 * Inner arrays are [fromState, toState] pairs.
 */
export const VALID_TRANSITIONS: Record<WorkflowEntityType, string[][]> = {
  /**
   * organizations.public_profile_status
   * draft → pending_review → active ↔ paused
   * active/paused/pending_review → archived (terminal)
   */
  org_profile_status: [
    ["draft", "pending_review"],
    ["pending_review", "active"],
    ["active", "paused"],
    ["paused", "active"],
    ["active", "archived"],
    ["paused", "archived"],
    ["pending_review", "archived"],
  ],

  /**
   * organizations.status (lifecycle)
   * seeded → managed → archived
   */
  org_lifecycle: [
    ["seeded", "managed"],
    ["managed", "archived"],
  ],

  /**
   * cases.status (Domain 1.2 — 12-state graph)
   * open → assigned → in_progress ↔ awaiting_applicant / awaiting_provider
   * in_progress | awaiting_* → ready_for_submission → submitted → under_review
   * under_review → approved | denied
   * approved | denied → closed
   * denied → appeal_in_progress → closed
   */
  case_status: [
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
  ],

  /**
   * advocate_connection_requests.status
   * pending → accepted | declined
   */
  advocate_connection: [
    ["pending", "accepted"],
    ["pending", "declined"],
  ],

  /**
   * referrals.status (or case_org_referrals, per service layer naming)
   * pending → accepted | declined
   */
  referral: [
    ["pending", "accepted"],
    ["pending", "declined"],
  ],

  /**
   * support_requests.status (Domain 1.1 SupportRequest)
   * draft → submitted → pending_review → accepted | declined | transferred
   * draft | submitted → withdrawn
   * accepted | declined | transferred | withdrawn → closed
   */
  support_request: [
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
  ],

  /**
   * state_workflow_configs.status (Domain 2.2)
   * draft → active (publish) → deprecated (terminal)
   * No path from deprecated back to active — a new draft must be created.
   */
  state_workflow_config_status: [
    ["draft", "active"],
    ["active", "deprecated"],
  ],

  /**
   * cvc_form_templates.status (Domain 2.3)
   * draft → active (publish) → deprecated (terminal)
   */
  cvc_form_template_status: [
    ["draft", "active"],
    ["active", "deprecated"],
  ],

  /**
   * translation_mapping_sets_v2.status (Domain 2.4)
   * draft → active (publish) → deprecated (terminal)
   */
  translation_mapping_set_status: [
    ["draft", "active"],
    ["active", "deprecated"],
  ],
};

/**
 * Returns true if fromState → toState is a registered edge for the given entityType.
 * O(n) per entity — graphs are small (< 10 edges each), no optimization needed.
 */
export function isValidTransition(
  entityType: WorkflowEntityType,
  fromState: string,
  toState: string,
): boolean {
  const edges = VALID_TRANSITIONS[entityType];
  if (!edges) return false;
  return edges.some(([f, t]) => f === fromState && t === toState);
}
