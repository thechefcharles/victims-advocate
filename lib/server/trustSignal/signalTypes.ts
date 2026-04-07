/**
 * Domain 0.5 — Trust Signal Infrastructure: canonical types.
 *
 * TrustSignalType: the 9 canonical signal categories the engine recognizes.
 * SignalEvent:     shape of a trust_signal_events row (read model).
 * SignalAggregate: shape of a trust_signal_aggregates row (read model).
 * EmitSignalParams / EmitSignalResult: emitSignal() I/O contract.
 *
 * Data class: B — Sensitive Operational.
 * No PII in signal values; org_id + signal counts only.
 */

/**
 * Canonical trust signal types.
 *
 * case_volume           — total number of cases for the org
 * case_age_distribution — average age of cases in days
 * routing_coverage      — fraction of cases with a routing run (0–1)
 * completeness_coverage — fraction of cases with a completeness run (0–1)
 * messaging_volume      — count of cases with any message thread
 * messaging_recency_30d — count of message threads active in the last 30 days
 * ocr_coverage          — fraction of cases with an OCR run (0–1)
 * appointment_coverage  — fraction of cases with an appointment (0–1)
 * profile_completeness  — completeness bucket score (0–1) for the org profile
 */
export type TrustSignalType =
  | "case_volume"
  | "case_age_distribution"
  | "routing_coverage"
  | "completeness_coverage"
  | "messaging_volume"
  | "messaging_recency_30d"
  | "ocr_coverage"
  | "appointment_coverage"
  | "profile_completeness";

/** All valid TrustSignalType values as a set — used for runtime validation. */
export const TRUST_SIGNAL_TYPES = new Set<TrustSignalType>([
  "case_volume",
  "case_age_distribution",
  "routing_coverage",
  "completeness_coverage",
  "messaging_volume",
  "messaging_recency_30d",
  "ocr_coverage",
  "appointment_coverage",
  "profile_completeness",
]);

/** Read model for a row in trust_signal_events. */
export interface SignalEvent {
  id: string;
  created_at: string;
  org_id: string;
  entity_type: string;
  signal_type: TrustSignalType;
  value: number;
  metadata?: Record<string, unknown>;
  actor_user_id: string;
  actor_account_type: string;
  idempotency_key: string;
}

/** Read model for a row in trust_signal_aggregates. */
export interface SignalAggregate {
  id: string;
  org_id: string;
  signal_type: TrustSignalType;
  total_count: number;
  total_value: number;
  last_event_at: string | null;
  updated_at: string;
}

/**
 * Input to emitSignal().
 *
 * idempotency_key format: "{orgId}:{signalType}:{sourceId}"
 * where sourceId is typically a date string (daily dedup) or a run ID.
 * The engine does not auto-derive this value — callers are responsible.
 */
export interface EmitSignalParams {
  orgId: string;
  signalType: TrustSignalType;
  value: number;
  actorUserId: string;
  actorAccountType: string;
  /** Caller-provided dedup key. Duplicate keys return reason: DUPLICATE. */
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

/**
 * Returned by emitSignal(). Always check success before proceeding.
 *
 * DUPLICATE         — a signal with this idempotency_key already exists.
 * INVALID_SIGNAL_TYPE — signalType is not in the canonical registry.
 * INTERNAL_ERROR    — unexpected DB failure.
 */
export interface EmitSignalResult {
  success: boolean;
  /** Present when success is true. UUID primary key of the inserted trust_signal_events row. */
  signalId?: string;
  reason?: "DUPLICATE" | "INVALID_SIGNAL_TYPE" | "INTERNAL_ERROR";
}
