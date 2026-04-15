/**
 * Domain 1.1 — SupportRequest: TypeScript types.
 *
 * Data class: Class A — Restricted.
 * All types are serializer-boundary aware. Raw DB shape is SupportRequestRecord;
 * surface-facing shapes are the *View variants.
 */

import type { SupportRequestStatus } from "@nxtstps/registry";

// ---------------------------------------------------------------------------
// DB row shape
// ---------------------------------------------------------------------------

/**
 * Raw database row shape for public.support_requests.
 * Never returned directly to any client surface — always pass through a serializer.
 */
export type SupportRequestRecord = {
  id: string;
  applicant_id: string;
  organization_id: string;
  program_id: string | null;
  status: SupportRequestStatus;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  withdrawn_at: string | null;
  closed_at: string | null;
  decline_reason: string | null;
  transfer_reason: string | null;
  case_id: string | null;
  state_workflow_config_id: string | null;
};

// ---------------------------------------------------------------------------
// Service inputs
// ---------------------------------------------------------------------------

/**
 * Validated input for creating a new support request.
 * applicant_id is resolved from the authenticated actor — never from client input.
 */
export type CreateSupportRequestInput = {
  organization_id: string;
  program_id?: string | null;
};

/**
 * Mutable fields on a draft support request. Status is NOT a mutable field here —
 * status changes go through the service action methods.
 */
export type UpdateSupportRequestInput = {
  organization_id?: string;
  program_id?: string | null;
};

/**
 * Input for declining a support request. decline_reason is required.
 */
export type DeclineSupportRequestInput = {
  decline_reason: string;
};

/**
 * Input for transferring a support request to another organization.
 */
export type TransferSupportRequestInput = {
  target_organization_id: string;
  transfer_reason: string;
};

// ---------------------------------------------------------------------------
// Serializer output shapes
// ---------------------------------------------------------------------------

/**
 * Applicant-safe view of a support request.
 * Excludes: reviewed_at, transfer_reason, state_workflow_config_id, case_id.
 * Exposes: status_reason (decline_reason when status = 'declined', else null).
 * Exposes: action_at (the terminal timestamp that applies to current status).
 */
export type SupportRequestApplicantView = {
  id: string;
  organization_id: string;
  program_id: string | null;
  status: SupportRequestStatus;
  submitted_at: string | null;
  /** Terminal action timestamp: accepted_at | declined_at | withdrawn_at | closed_at — whichever is set. */
  action_at: string | null;
  /** decline_reason when status = 'declined'; null otherwise. */
  status_reason: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Provider-internal view of a support request.
 * Includes all fields except state_workflow_config_id.
 */
export type SupportRequestProviderView = {
  id: string;
  applicant_id: string;
  organization_id: string;
  program_id: string | null;
  status: SupportRequestStatus;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  withdrawn_at: string | null;
  closed_at: string | null;
  decline_reason: string | null;
  transfer_reason: string | null;
  case_id: string | null;
};

/**
 * Platform admin view of a support request. All fields included.
 */
export type SupportRequestAdminView = SupportRequestRecord;
