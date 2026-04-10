/**
 * Domain 1.1 — SupportRequest: serializers.
 *
 * Three serializer functions enforce the boundary between the raw DB record
 * and the surface-facing shapes. No business logic here — only field selection.
 *
 * Data class: Class A — Restricted.
 * Never return a SupportRequestRecord directly from any route or service method.
 */

import type { SupportRequestRecord } from "./supportRequestTypes";
import type {
  SupportRequestApplicantView,
  SupportRequestProviderView,
  SupportRequestAdminView,
} from "./supportRequestTypes";

// ---------------------------------------------------------------------------
// Applicant serializer
// ---------------------------------------------------------------------------

/**
 * Returns the applicant-safe view of a support request.
 *
 * Excludes: reviewed_at, transfer_reason, state_workflow_config_id, case_id.
 * Includes:
 *   - action_at: the terminal timestamp that applies to the current status.
 *   - status_reason: decline_reason when status = 'declined', else null.
 */
export function serializeForApplicant(record: SupportRequestRecord): SupportRequestApplicantView {
  const action_at =
    record.accepted_at ??
    record.declined_at ??
    record.withdrawn_at ??
    record.closed_at ??
    null;

  const status_reason = record.status === "declined" ? (record.decline_reason ?? null) : null;

  return {
    id: record.id,
    organization_id: record.organization_id,
    program_id: record.program_id,
    status: record.status,
    submitted_at: record.submitted_at,
    action_at,
    status_reason,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Provider serializer
// ---------------------------------------------------------------------------

/**
 * Returns the provider-internal view of a support request.
 * Includes all fields except state_workflow_config_id.
 */
export function serializeForProvider(record: SupportRequestRecord): SupportRequestProviderView {
  return {
    id: record.id,
    applicant_id: record.applicant_id,
    organization_id: record.organization_id,
    program_id: record.program_id,
    status: record.status,
    created_at: record.created_at,
    updated_at: record.updated_at,
    submitted_at: record.submitted_at,
    reviewed_at: record.reviewed_at,
    accepted_at: record.accepted_at,
    declined_at: record.declined_at,
    withdrawn_at: record.withdrawn_at,
    closed_at: record.closed_at,
    decline_reason: record.decline_reason,
    transfer_reason: record.transfer_reason,
    case_id: record.case_id,
  };
}

// ---------------------------------------------------------------------------
// Admin serializer
// ---------------------------------------------------------------------------

/**
 * Returns the full admin view of a support request (all fields).
 */
export function serializeForAdmin(record: SupportRequestRecord): SupportRequestAdminView {
  return { ...record };
}
