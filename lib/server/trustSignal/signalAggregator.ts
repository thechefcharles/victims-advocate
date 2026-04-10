/**
 * Domain 0.5 — Trust Signal Infrastructure: signal aggregator.
 *
 * refreshAggregates(orgId, supabase) → Promise<void>
 *   Reads trust_signal_events for the org, groups by signal_type,
 *   computes totals, and upserts into trust_signal_aggregates.
 *   Pure log aggregation — no pre-computed values accepted.
 *   Never throws.
 *
 * getSignalAggregates(orgId, supabase) → Promise<SignalAggregate[]>
 *   Reads current aggregate rows for the org.
 *   Returns empty array if none exist yet.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SignalAggregate, TrustSignalType } from "./signalTypes";
import { TRUST_SIGNAL_TYPES } from "./signalTypes";

type SignalEventRow = {
  signal_type: string;
  value: number;
  created_at: string;
};

/**
 * Recomputes trust_signal_aggregates for an org from the event log.
 *
 * For each TrustSignalType:
 *   - COUNT all events for (org_id, signal_type)
 *   - SUM their values
 *   - MAX their created_at
 *   - UPSERT the aggregate row ON CONFLICT (org_id, signal_type)
 *
 * Called fire-and-forget after every successful emitSignal().
 * Also safe to call directly for manual re-aggregation.
 */
export async function refreshAggregates(orgId: string, supabase: SupabaseClient): Promise<void> {
  try {
    const { data: events, error } = await supabase
      .from("trust_signal_events")
      .select("signal_type, value, created_at")
      .eq("org_id", orgId);

    if (error || !events) return;

    const rows = events as SignalEventRow[];

    // Group by signal_type
    const grouped = new Map<
      TrustSignalType,
      { count: number; sum: number; maxAt: string | null }
    >();

    for (const signalType of TRUST_SIGNAL_TYPES) {
      grouped.set(signalType, { count: 0, sum: 0, maxAt: null });
    }

    for (const row of rows) {
      const type = row.signal_type as TrustSignalType;
      if (!TRUST_SIGNAL_TYPES.has(type)) continue;
      const group = grouped.get(type)!;
      group.count++;
      group.sum += Number(row.value) || 0;
      if (!group.maxAt || row.created_at > group.maxAt) {
        group.maxAt = row.created_at;
      }
    }

    // Upsert each signal type that has at least one event
    const upserts = [];
    for (const [signalType, { count, sum, maxAt }] of grouped.entries()) {
      if (count === 0) continue;
      upserts.push({
        org_id: orgId,
        signal_type: signalType,
        total_count: count,
        total_value: sum,
        last_event_at: maxAt,
        updated_at: new Date().toISOString(),
      });
    }

    if (upserts.length === 0) return;

    await supabase
      .from("trust_signal_aggregates")
      .upsert(upserts, { onConflict: "org_id,signal_type" });
  } catch {
    // Never throw — aggregator failures are silent (fire-and-forget context)
  }
}

/**
 * Returns current trust_signal_aggregates rows for an org.
 * Returns an empty array if no aggregates exist yet (pre-seed state).
 *
 * Used by grading/inputs.ts to check whether aggregates are populated
 * before falling back to the live getOrganizationSignals() path.
 */
export async function getSignalAggregates(
  orgId: string,
  supabase: SupabaseClient,
): Promise<SignalAggregate[]> {
  try {
    const { data, error } = await supabase
      .from("trust_signal_aggregates")
      .select("id,org_id,signal_type,total_count,total_value,last_event_at,updated_at")
      .eq("org_id", orgId);

    if (error || !data) return [];
    return data as SignalAggregate[];
  } catch {
    return [];
  }
}
