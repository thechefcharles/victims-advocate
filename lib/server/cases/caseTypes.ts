/**
 * Domain 1.2 — Case: TypeScript types.
 *
 * Data class: Class A — Restricted.
 * Raw DB shape is CaseRecord; surface-facing shapes are the *View variants.
 * Never return a CaseRecord directly from a route — always pass through a serializer.
 */

import type { CaseStatus } from "@nxtstps/registry";

// ---------------------------------------------------------------------------
// DB row shape
// ---------------------------------------------------------------------------

/**
 * Raw database row shape for public.cases.
 * Includes all columns as of migration 20260502000000_case_status_12state.sql.
 */
export type CaseRecord = {
  id: string;
  owner_user_id: string;
  organization_id: string | null;
  program_id: string | null;
  support_request_id: string | null;
  assigned_advocate_id: string | null;
  status: CaseStatus;
  name: string | null;
  application: string | null;
  eligibility_answers: Record<string, unknown> | null;
  eligibility_result: string | null;
  eligibility_readiness: string | null;
  eligibility_completed_at: string | null;
  state_code: string | null;
  submitted_at: string | null;
  outcome_recorded_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Service inputs
// ---------------------------------------------------------------------------

/** Input to create a Case from an accepted SupportRequest. */
export type CreateCaseFromSupportRequestInput = {
  support_request_id: string;
  organization_id: string;
  program_id?: string | null;
};

/** Mutable non-status fields on a case. Status changes go through action methods. */
export type UpdateCaseFieldsInput = {
  name?: string | null;
  application?: string | null;
  eligibility_answers?: Record<string, unknown> | null;
  eligibility_result?: string | null;
  eligibility_readiness?: string | null;
  state_code?: string | null;
};

/** Input to assign or reassign a case to an advocate. */
export type AssignCaseInput = {
  advocate_id: string;
};

/** Input to record the outcome of a case. */
export type RecordOutcomeInput = {
  outcome: "approved" | "denied";
};

// ---------------------------------------------------------------------------
// Serializer output shapes
// ---------------------------------------------------------------------------

/**
 * Applicant-safe view of a case.
 * Excludes: eligibility_result internals, advocate identity, internal timestamps.
 */
export type CaseApplicantView = {
  id: string;
  organization_id: string | null;
  program_id: string | null;
  status: CaseStatus;
  name: string | null;
  application: string | null;
  eligibility_answers: Record<string, unknown> | null;
  eligibility_readiness: string | null;
  state_code: string | null;
  submitted_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Provider-internal view of a case.
 * Includes all operational fields except raw application JSON blob.
 */
export type CaseProviderView = {
  id: string;
  owner_user_id: string;
  organization_id: string | null;
  program_id: string | null;
  support_request_id: string | null;
  assigned_advocate_id: string | null;
  status: CaseStatus;
  name: string | null;
  eligibility_answers: Record<string, unknown> | null;
  eligibility_result: string | null;
  eligibility_readiness: string | null;
  state_code: string | null;
  submitted_at: string | null;
  outcome_recorded_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Platform admin view of a case. All fields.
 */
export type CaseAdminView = CaseRecord;
