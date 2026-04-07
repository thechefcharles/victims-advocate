/**
 * Domain 1.2 — Case: serializers.
 *
 * Three serializer functions enforce the boundary between the raw DB record
 * and the surface-facing shapes. No business logic — only field selection.
 *
 * Data class: Class A — Restricted.
 * Never return a CaseRecord directly from any route or service method.
 */

import type { CaseRecord } from "./caseTypes";
import type { CaseApplicantView, CaseProviderView, CaseAdminView } from "./caseTypes";

// ---------------------------------------------------------------------------
// Applicant serializer
// ---------------------------------------------------------------------------

/**
 * Returns the applicant-safe view of a case.
 * Excludes: owner_user_id, support_request_id, assigned_advocate_id,
 *           eligibility_result, outcome_recorded_at (internal fields).
 */
export function serializeCaseForApplicant(record: CaseRecord): CaseApplicantView {
  return {
    id: record.id,
    organization_id: record.organization_id,
    program_id: record.program_id,
    status: record.status,
    name: record.name,
    application: record.application,
    eligibility_answers: record.eligibility_answers,
    eligibility_readiness: record.eligibility_readiness,
    state_code: record.state_code,
    submitted_at: record.submitted_at,
    closed_at: record.closed_at,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Provider serializer
// ---------------------------------------------------------------------------

/**
 * Returns the provider-internal view of a case.
 * Excludes the raw application blob (bulk upload artifact, not needed for queue view).
 */
export function serializeCaseForProvider(record: CaseRecord): CaseProviderView {
  return {
    id: record.id,
    owner_user_id: record.owner_user_id,
    organization_id: record.organization_id,
    program_id: record.program_id,
    support_request_id: record.support_request_id,
    assigned_advocate_id: record.assigned_advocate_id,
    status: record.status,
    name: record.name,
    eligibility_answers: record.eligibility_answers,
    eligibility_result: record.eligibility_result,
    eligibility_readiness: record.eligibility_readiness,
    state_code: record.state_code,
    submitted_at: record.submitted_at,
    outcome_recorded_at: record.outcome_recorded_at,
    closed_at: record.closed_at,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Admin serializer
// ---------------------------------------------------------------------------

/** Returns the full admin view of a case (all fields). */
export function serializeCaseForAdmin(record: CaseRecord): CaseAdminView {
  return { ...record };
}
