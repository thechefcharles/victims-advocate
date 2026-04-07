/**
 * Domain 0.4 — Workflow State Infrastructure: transition engine.
 *
 * transition(params, supabase) → Promise<WorkflowTransitionResult>
 *
 * Responsibility:
 *   1. Validate that fromState → toState is a registered edge (STATE_INVALID if not).
 *   2. Insert a row into workflow_state_log — this is the authorization record.
 *   3. Return { success: true, transitionId } so the caller can proceed with the DB write.
 *
 * IMPORTANT: transition() does NOT update the entity's status column.
 * The caller is responsible for the actual .update({ status: toState }).
 * Callers MUST only issue the .update() if transition() returns success: true.
 *
 * Audit rule: every successful transition is recorded in workflow_state_log.
 * Failed validations (STATE_INVALID) are not logged — no audit row for rejections.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TransitionParams, WorkflowTransitionResult } from "./types";
import { isValidTransition } from "./transitions";

/**
 * Validates and logs a workflow state transition.
 *
 * @param params   - Transition parameters including entity identity, states, and actor.
 * @param supabase - Admin Supabase client (service role). Must be pre-initialized by caller.
 * @returns        WorkflowTransitionResult — always check success before issuing the status UPDATE.
 */
export async function transition(
  params: TransitionParams,
  supabase: SupabaseClient,
): Promise<WorkflowTransitionResult> {
  const { entityType, entityId, fromState, toState, actorUserId, actorAccountType, tenantId, metadata } =
    params;

  // 1. Validate the transition edge.
  if (!isValidTransition(entityType, fromState, toState)) {
    return {
      success: false,
      fromState,
      toState,
      reason: "STATE_INVALID",
    };
  }

  // 2. Insert the authorization record into workflow_state_log.
  try {
    const { data, error } = await supabase
      .from("workflow_state_log")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        from_state: fromState,
        to_state: toState,
        actor_user_id: actorUserId,
        actor_account_type: actorAccountType,
        tenant_id: tenantId ?? null,
        metadata: metadata ?? null,
      })
      .select("id")
      .single();

    if (error || !data) {
      return {
        success: false,
        fromState,
        toState,
        reason: "INTERNAL_ERROR",
      };
    }

    // 3. Return success with the log row id as transitionId.
    return {
      success: true,
      transitionId: data.id as string,
      fromState,
      toState,
    };
  } catch {
    return {
      success: false,
      fromState,
      toState,
      reason: "INTERNAL_ERROR",
    };
  }
}
