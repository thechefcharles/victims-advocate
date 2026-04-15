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
 * Keys that are banned from `metadata` because they either are PII directly or
 * commonly carry PII as values. The emitter rejects any event whose metadata
 * contains one of these keys so that signal logs stay within Data Class B
 * (operational; no person-identifying content).
 *
 * The check is a denylist over top-level key names only — nested objects are
 * not inspected since the domain services always pass flat metadata.
 */
const PII_KEYS = new Set<string>([
  "userId",
  "user_id",
  "applicantId",
  "applicant_id",
  "victimId",
  "victim_id",
  "name",
  "firstName",
  "first_name",
  "lastName",
  "last_name",
  "displayName",
  "display_name",
  "email",
  "phone",
  "phoneNumber",
  "phone_number",
  "contactInfo",
  "contact_info",
  "address",
]);

function assertNoPiiMetadata(metadata: Record<string, unknown> | undefined): void {
  if (!metadata) return;
  for (const key of Object.keys(metadata)) {
    if (PII_KEYS.has(key)) {
      throw new Error(
        `emitSignal: metadata contains PII-sensitive key "${key}". ` +
          `Signal logs must only carry org-scoped identifiers and counts.`,
      );
    }
  }
}

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

  // 1a. Reject metadata containing PII-sensitive keys. Signals are operational
  //     aggregate inputs; Phase 6 scoring must never ingest person-identifying
  //     values. Violation is a programming error, so we throw rather than
  //     silently drop the event.
  assertNoPiiMetadata(metadata);

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
