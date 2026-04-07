/**
 * Domain 0.5 — Trust Signal Infrastructure public surface.
 *
 * Import everything from here:
 *   import { emitSignal, refreshAggregates, getSignalAggregates } from "@/lib/server/trustSignal"
 *   import type { TrustSignalType, EmitSignalParams, SignalAggregate } from "@/lib/server/trustSignal"
 *
 * Do NOT import directly from sub-files in new code.
 */

export { emitSignal } from "./signalEmitter";
export { refreshAggregates, getSignalAggregates } from "./signalAggregator";
export {
  TRUST_SIGNAL_TYPES,
  type TrustSignalType,
  type SignalEvent,
  type SignalAggregate,
  type EmitSignalParams,
  type EmitSignalResult,
} from "./signalTypes";
