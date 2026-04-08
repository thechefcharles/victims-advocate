/**
 * Domain 0.4 — Workflow State Infrastructure: types.
 *
 * WorkflowEntityType: all state-machine entities in the system.
 * WorkflowTransitionResult: returned by transition() — inspect success before writing.
 * TransitionParams: input to transition().
 * WorkflowLogEntry: shape of a workflow_state_log row.
 */

/** All entities whose status is governed by the workflow state engine. */
export type WorkflowEntityType =
  | "org_profile_status"
  | "org_lifecycle"
  | "case_status"
  | "advocate_connection"
  | "referral"
  | "support_request"
  | "state_workflow_config_status";

/** A valid edge in a state graph: fromState → toState for a given action label. */
export interface WorkflowTransition<TFrom extends string = string, TTo extends string = string> {
  fromState: TFrom;
  toState: TTo;
  /** Human-readable label for the transition (informational only). */
  action: string;
}

/** Returned by transition(). Always check success before proceeding with the DB write. */
export interface WorkflowTransitionResult {
  success: boolean;
  /** Present when success is true. The UUID primary key of the workflow_state_log row. */
  transitionId?: string;
  fromState: string;
  toState: string;
  /**
   * Present when success is false.
   * STATE_INVALID   — fromState → toState is not a registered edge for this entity type.
   * INTERNAL_ERROR  — workflow_state_log insert failed.
   */
  reason?: "STATE_INVALID" | "INTERNAL_ERROR";
}

/** Shape of a row in workflow_state_log (read model). */
export interface WorkflowLogEntry {
  id: string;
  entityType: WorkflowEntityType;
  entityId: string;
  fromState: string;
  toState: string;
  actorUserId: string;
  actorAccountType: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/** Input to transition(). Caller must supply all required fields. */
export interface TransitionParams {
  entityType: WorkflowEntityType;
  entityId: string;
  fromState: string;
  toState: string;
  actorUserId: string;
  actorAccountType: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}
