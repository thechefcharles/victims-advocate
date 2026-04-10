/**
 * Domain 0.5 — Trust Signal Infrastructure: canonical types.
 *
 * TrustSignalType: the 35 canonical signal categories the engine recognizes.
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
 * case_response_time    — avg hours from case open to first provider action (Domain 1.2)
 * case_time_to_resolution — avg hours from case open to closed (Domain 1.2)
 * message_response_latency — hours from applicant message to first provider reply (Domain 1.3)
 * document_submission_latency — days from case open to first document uploaded (Domain 1.4)
 * document_completion_rate — fraction of required document types uploaded (0–1) (Domain 1.4)
 * document_request_fulfillment_time — days from document request to fulfillment (Domain 1.4)
 * consent_grant_rate — fraction of cases where applicant granted consent (0–1) (Domain 1.4)
 * consent_revocation_rate — fraction of active consent grants revoked (0–1) (Domain 1.4)
 * consent_request_response_time — hours from provider consent request to applicant response (Domain 1.4)
 * intake_started — emitted when an applicant opens a new intake session (Domain 2.1)
 * intake_completed — emitted when an intake session is submitted (Domain 2.1)
 * intake_abandoned — emitted when a draft session is detected idle past abandonment threshold (Domain 2.1)
 * intake_completion_rate — fraction of started sessions that reach submitted state (0–1) (Domain 2.1)
 * intake_field_completion_rate — fraction of fields with non-skipped responses on submission (0–1) (Domain 2.1)
 * intake_validation_failure_rate — count of validation failures per session/step (Domain 2.1)
 * intake_time_to_complete — minutes from intake_started to intake_completed (Domain 2.1)
 * state_config_published — emitted when a state_workflow_config transitions draft → active (Domain 2.2)
 * state_config_deprecated — emitted when a state_workflow_config transitions active → deprecated (Domain 2.2)
 * state_config_updated — emitted when a draft state_workflow_config is mutated (Domain 2.2)
 * schema_version_changed — emitted when an intake_schema row is published in a new config version (Domain 2.2)
 * eligibility_rules_changed — emitted when an eligibility_rule_set is published in a new config version (Domain 2.2)
 * document_requirements_changed — emitted when a document_requirement_set is published in a new config version (Domain 2.2)
 * cvc_template_activated — emitted when a cvc_form_template transitions draft → active (Domain 2.3)
 * cvc_template_deprecated — emitted when a cvc_form_template transitions active → deprecated (Domain 2.3)
 * cvc_form_generated — emitted when an output_generation_job completes successfully (Domain 2.3)
 * cvc_form_generation_failed — emitted when an output_generation_job fails (Domain 2.3)
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
  | "profile_completeness"
  | "case_response_time"
  | "case_time_to_resolution"
  | "message_response_latency"
  | "document_submission_latency"
  | "document_completion_rate"
  | "document_request_fulfillment_time"
  | "consent_grant_rate"
  | "consent_revocation_rate"
  | "consent_request_response_time"
  | "intake_started"
  | "intake_completed"
  | "intake_abandoned"
  | "intake_completion_rate"
  | "intake_field_completion_rate"
  | "intake_validation_failure_rate"
  | "intake_time_to_complete"
  | "state_config_published"
  | "state_config_deprecated"
  | "state_config_updated"
  | "schema_version_changed"
  | "eligibility_rules_changed"
  | "document_requirements_changed"
  | "cvc_template_activated"
  | "cvc_template_deprecated"
  | "cvc_form_generated"
  | "cvc_form_generation_failed";

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
  "case_response_time",
  "case_time_to_resolution",
  "message_response_latency",
  "document_submission_latency",
  "document_completion_rate",
  "document_request_fulfillment_time",
  "consent_grant_rate",
  "consent_revocation_rate",
  "consent_request_response_time",
  "intake_started",
  "intake_completed",
  "intake_abandoned",
  "intake_completion_rate",
  "intake_field_completion_rate",
  "intake_validation_failure_rate",
  "intake_time_to_complete",
  "state_config_published",
  "state_config_deprecated",
  "state_config_updated",
  "schema_version_changed",
  "eligibility_rules_changed",
  "document_requirements_changed",
  "cvc_template_activated",
  "cvc_template_deprecated",
  "cvc_form_generated",
  "cvc_form_generation_failed",
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
