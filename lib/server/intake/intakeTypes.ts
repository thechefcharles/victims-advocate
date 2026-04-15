/**
 * Domain 2.1 — Intake: TypeScript types.
 *
 * Data class: Class A — Restricted.
 * Raw DB shapes are *Record; surface-facing shapes are *View variants.
 * Never return a *Record directly from a route — always pass through a serializer.
 */

import type { IntakeSessionStatus } from "@nxtstps/registry";

// ---------------------------------------------------------------------------
// DB row shapes
// ---------------------------------------------------------------------------

/** Raw database row for public.intake_sessions. */
export type IntakeSessionRecord = {
  id: string;
  owner_user_id: string;
  case_id: string | null;
  support_request_id: string | null;
  organization_id: string | null;
  state_code: "IL" | "IN";
  status: IntakeSessionStatus;
  draft_payload: Record<string, unknown>;
  intake_schema_version: string;
  /** Domain 2.2 — UUID FK to state_workflow_configs.id. Nullable until populated by intakeService.startIntake. */
  state_workflow_config_id: string | null;
  /** Domain 2.4 — UUID FK to translation_mapping_sets_v2.id. Nullable until populated by intakeService.startIntake. */
  translation_mapping_set_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Raw database row for public.intake_submissions. Immutable after insert. */
export type IntakeSubmissionRecord = {
  id: string;
  session_id: string;
  case_id: string | null;
  organization_id: string | null;
  owner_user_id: string;
  submitted_payload: Record<string, unknown>;
  intake_schema_version: string;
  /** Domain 2.2 — copied from the linked session at submission time. */
  state_workflow_config_id: string | null;
  /** Domain 2.4 — copied from the linked session at submission time. */
  translation_mapping_set_id: string | null;
  state_code: "IL" | "IN";
  submitted_at: string;
  submitted_by_user_id: string | null;
};

/** Raw database row for public.intake_amendments. Append-only. */
export type IntakeAmendmentRecord = {
  id: string;
  submission_id: string;
  field_key: string;
  previous_value: unknown;
  new_value: unknown;
  reason: string | null;
  amended_by_user_id: string;
  amended_at: string;
};

// Re-export status enum for service-layer convenience.
export type { IntakeSessionStatus };

// ---------------------------------------------------------------------------
// Service inputs
// ---------------------------------------------------------------------------

export type CreateIntakeSessionInput = {
  state_code: "IL" | "IN";
  case_id?: string | null;
  support_request_id?: string | null;
  organization_id?: string | null;
};

export type SaveIntakeDraftInput = {
  draftPayload: Record<string, unknown>;
  /** Optional step key for telemetry — not persisted on the row. */
  stepKey?: string;
};

export type SubmitIntakeInput = {
  // No fields today — submission is derived from session.draft_payload.
  // Reserved for future flags (e.g. force submit override).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _reserved?: never;
};

export type AmendIntakeSubmissionInput = {
  fieldKey: string;
  newValue: unknown;
  reason?: string;
};

// ---------------------------------------------------------------------------
// ApplicantSearchProfile — output of buildSearchAttributesFromIntake
// ---------------------------------------------------------------------------

/**
 * Typed search attributes derived from a submitted intake.
 *
 * This is the only shape buildSearchAttributesFromIntake() may return.
 * It MUST NOT contain raw legacy intake payload fields, organization
 * data, or anything routed through searchService.ts. (Search Law — Rule 12.)
 *
 * safetyModeEnabled is intentionally NOT part of this shape — it is a
 * separate axis carried on AuthContext and applied by the matching layer.
 */
export type ApplicantSearchProfile = {
  state: "IL" | "IN";
  county: string | null;
  language: string | null;
  /** Boolean map of normalized applicant needs (passed through from intake losses.* flags). */
  needs: Record<string, boolean>;
  urgencyLevel: "high" | "medium" | "low";
  advocateAssisted: boolean;
};

// ---------------------------------------------------------------------------
// Serializer output shapes
// ---------------------------------------------------------------------------

/**
 * Applicant-safe view of an intake session (and optional submission).
 * Excludes: organization internal metadata, provider notes, full amendment history.
 */
export type IntakeApplicantView = {
  id: string;
  status: IntakeSessionStatus;
  state_code: "IL" | "IN";
  intake_schema_version: string;
  /** A summary of how many top-level keys are present in draft_payload — never the raw payload of provider notes. */
  draft_progress: {
    populated_field_count: number;
  };
  /** Full draft payload included for the owner so they can resume. */
  draft_payload: Record<string, unknown>;
  submission_id: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Provider review view of a submission (and optional amendment indicators).
 * Excludes: applicant draft-only field state map, autosave timestamps.
 */
export type IntakeProviderView = {
  id: string;
  session_id: string;
  case_id: string | null;
  organization_id: string | null;
  owner_user_id: string;
  state_code: "IL" | "IN";
  intake_schema_version: string;
  submitted_payload: Record<string, unknown>;
  submitted_at: string;
  submitted_by_user_id: string | null;
  amendment_count: number;
  has_amendments: boolean;
};
