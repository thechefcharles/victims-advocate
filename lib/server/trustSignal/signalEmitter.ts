/**
 * Domain 0.5 — Trust Signal Infrastructure: signal emitter.
 *
 * emitSignal(params, supabase) → Promise<EmitSignalResult>
 *
 * Responsibilities:
 *   1. Validate the signalType is in the canonical registry.
 *   2. Insert into trust_signal_events. Duplicate idempotency_key → DUPLICATE.
 *   3. Fire-and-forget refreshAggregates() after successful insert.
 *   4. Never throw. All failures return via EmitSignalResult.
 *
 * Callers use fire-and-forget (void emitSignal(...)) for background emission.
 * Always await when you need confirmation of success.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmitSignalParams, EmitSignalResult } from "./signalTypes";
import { TRUST_SIGNAL_TYPES } from "./signalTypes";
import { refreshAggregates } from "./signalAggregator";

/**
 * Emits a trust signal event for an organization.
 *
 * @param params   - Signal parameters including org, type, value, actor, and idempotency key.
 * @param supabase - Admin Supabase client (service role). Must be pre-initialized by caller.
 * @returns        EmitSignalResult — check success before treating the event as recorded.
 *
 * idempotency_key format: "{orgId}:{signalType}:{sourceId}"
 * Duplicate keys silently return reason: DUPLICATE — not an error, just a dedup hit.
 */
export async function emitSignal(
  params: EmitSignalParams,
  supabase: SupabaseClient,
): Promise<EmitSignalResult> {
  const { orgId, signalType, value, actorUserId, actorAccountType, idempotencyKey, metadata } =
    params;

  // 1. Validate signal type is in the canonical registry.
  if (!TRUST_SIGNAL_TYPES.has(signalType)) {
    return { success: false, reason: "INVALID_SIGNAL_TYPE" };
  }

  try {
    // 2. Insert into trust_signal_events.
    //    ON CONFLICT (idempotency_key) means a duplicate returns null data.
    const { data, error } = await supabase
      .from("trust_signal_events")
      .insert({
        org_id: orgId,
        entity_type: "organization",
        signal_type: signalType,
        value,
        metadata: metadata ?? null,
        actor_user_id: actorUserId,
        actor_account_type: actorAccountType,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (error) {
      // Postgres unique violation code = 23505
      if (error.code === "23505") {
        return { success: false, reason: "DUPLICATE" };
      }
      return { success: false, reason: "INTERNAL_ERROR" };
    }

    if (!data) {
      return { success: false, reason: "INTERNAL_ERROR" };
    }

    // 3. Fire-and-forget aggregate refresh.
    void refreshAggregates(orgId, supabase);

    // 4. Return success with the new row's id.
    return { success: true, signalId: data.id as string };
  } catch {
    return { success: false, reason: "INTERNAL_ERROR" };
  }
}
