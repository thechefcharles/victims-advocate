/**
 * Workflow status enums — canonical registry for NxtStps 2.0.
 *
 * Each type is owned by a specific domain. Values here reflect the target
 * architecture state. During migration, DB CHECK constraints and existing
 * domain type files may use a subset of these values.
 *
 * Domain-specific operational statuses (ocr_fields, notifications,
 * routing_runs, case_messages, completeness_runs, knowledge_base, etc.)
 * remain in their domain type files and are NOT registered here until
 * each domain is refactored.
 *
 * Authority: docs/AGENTS.md + docs/CODING_CONTEXT.md (Notion bridge).
 * Domain numbers sourced from CODING_CONTEXT.md where confirmed; others
 * are inferred from the execution prompt and require Notion spec verification.
 *
 * ⚠️  Values marked [INFERRED] are derived from domain context and existing
 *    DB migrations. Confirm against Notion domain spec before locking.
 *    Values marked [DB-CONFIRMED] are locked to existing CHECK constraints
 *    and must not be changed without a new migration.
 */

// ---------------------------------------------------------------------------
// Domain 1.1 — SupportRequest
// ---------------------------------------------------------------------------

/**
 * Owned by Domain 1.1 SupportRequest. 8 canonical states.
 * [DB-CONFIRMED] Matches support_requests.status CHECK constraint in
 * migration 20260501500000_support_requests.sql.
 */
export type SupportRequestStatus =
  | "draft"
  | "submitted"
  | "pending_review"
  | "accepted"
  | "declined"
  | "transferred"
  | "withdrawn"
  | "closed";

// ---------------------------------------------------------------------------
// Domain 1.2 — Case
// ---------------------------------------------------------------------------

/**
 * Owned by: Domain 1.2 Case
 * [DB-CONFIRMED] Matches `cases.status` CHECK constraint in migration
 * 20260502000000_case_status_12state.sql. Do not change without a new migration.
 */
export type CaseStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "awaiting_applicant"
  | "awaiting_provider"
  | "ready_for_submission"
  | "submitted"
  | "under_review"
  | "approved"
  | "denied"
  | "appeal_in_progress"
  | "closed";

// ---------------------------------------------------------------------------
// Domain 1.3 — Messaging
// ---------------------------------------------------------------------------

/**
 * Owned by: Domain 1.3 Messaging
 * [DB-CONFIRMED] Matches case_conversations.status CHECK constraint in
 * migration 20260503000000_messaging_thread_v2.sql.
 * "read_only" replaces the legacy "closed" value (data-migrated).
 */
export type MessageThreadStatus = "active" | "read_only" | "archived";

// ---------------------------------------------------------------------------
// Domain 1.3 — IntakeSession
// ---------------------------------------------------------------------------

/**
 * Owned by: Domain 2.1 Intake
 * [CONFIRMED domain number — CODING_CONTEXT.md] [INFERRED values]
 * Confirm values against Notion domain 2.1 spec before execution pass.
 */
export type IntakeSessionStatus =
  | "in_progress"
  | "completed"
  | "abandoned"
  | "expired";

// ---------------------------------------------------------------------------
// Domain 1.4 — Referral
// ---------------------------------------------------------------------------

/**
 * Owned by: Domain 1.4 Referral
 * [DB-CONFIRMED] Matches `case_org_referrals.status` CHECK constraint in
 * migration 20260429120000_case_org_referrals.sql.
 * Do not change without a new migration.
 */
export type ReferralStatus =
  | "pending"
  | "accepted"
  | "declined";

// ---------------------------------------------------------------------------
// Domain 1.5 — Appointment
// ---------------------------------------------------------------------------

/**
 * Owned by: Domain 1.5 Appointment
 * [INFERRED] Confirm values against Notion spec before execution pass.
 */
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

// ---------------------------------------------------------------------------
// Domain 2.1 — ConsentGrant
// ---------------------------------------------------------------------------

/**
 * Owned by: Domain 1.4 Documents + Consent
 * [CONFIRMED domain number — CODING_CONTEXT.md: "1.4 Documents + Consent"]
 * ConsentGrant is the VOCA/VAWA enforcement mechanism for victim-identifying
 * data disclosure. See CODING_CONTEXT.md Part 2 — VOCA/VAWA Confidentiality.
 * [INFERRED values] Confirm against Notion domain 1.4 spec before execution pass.
 */
export type ConsentGrantStatus =
  | "pending"
  | "granted"
  | "revoked"
  | "expired";

// ---------------------------------------------------------------------------
// Domain 2.2 — TrustedHelper
// ---------------------------------------------------------------------------

/**
 * Owned by: Domain 2.2 TrustedHelper
 * [INFERRED] Confirm values against Notion spec before execution pass.
 */
export type TrustedHelperStatus =
  | "pending"
  | "active"
  | "revoked";

// ---------------------------------------------------------------------------
// Domain 5.1 — ScoreMethodology
// ---------------------------------------------------------------------------

/**
 * Owned by: Domain 5.1 ScoreMethodology
 * [INFERRED] Adjacent to `org_quality_scores.status` (current/superseded/draft)
 * but target enum uses `active` not `current`. Confirm against Notion spec.
 */
export type ScoreMethodologyStatus =
  | "draft"
  | "active"
  | "superseded";

// ---------------------------------------------------------------------------
// Domain 5.2 — ScoreDispute
// ---------------------------------------------------------------------------

/**
 * Owned by: Domain 5.2 ScoreDispute
 * [DB-CONFIRMED] Mirrors `org_designation_review_requests.status` CHECK
 * constraint in migration 20260317200000_org_designation_review_requests.sql.
 * This is the dispute mechanism for the grading/scoring system.
 */
export type ScoreDisputeStatus =
  | "pending"
  | "in_review"
  | "resolved_affirmed"
  | "resolved_recomputed"
  | "resolved_declined"
  | "withdrawn";

// ---------------------------------------------------------------------------
// Domain 3.1 — ProviderAffiliation
// ---------------------------------------------------------------------------

/**
 * Owned by: Domain 3.1 ProviderAffiliation
 * [INFERRED] Confirm values against Notion spec before execution pass.
 */
export type ProviderAffiliationStatus =
  | "pending"
  | "active"
  | "inactive"
  | "terminated";

// ---------------------------------------------------------------------------
// Domain 4.1 — ChangeRequest
// ---------------------------------------------------------------------------

/**
 * Owned by: Domain 7.1 Governance / ChangeRequest
 * [CONFIRMED domain number — CODING_CONTEXT.md: "7.1 Governance / ChangeRequest"]
 * Domain 7.1 is a SOC 2 Type I pre-requisite (must be locked before Month 9 audit).
 * [INFERRED values] Confirm against Notion domain 7.1 spec before execution pass.
 */
export type ChangeRequestStatus =
  | "pending"
  | "approved"
  | "declined"
  | "withdrawn";

// ---------------------------------------------------------------------------
// Domain 6.1 — AIGuidanceSession
// ---------------------------------------------------------------------------

/**
 * Owned by: Domain 7.3 AI Chatbot / Guidance
 * [CONFIRMED domain number — CODING_CONTEXT.md: "7.3 AI Chatbot"]
 * Escalation path to human/crisis resources must always be visible.
 * No clinical claims permitted on any AI guidance surface.
 * [INFERRED values] Confirm against Notion domain 7.3 spec before execution pass.
 */
export type AIGuidanceSessionStatus =
  | "active"
  | "completed"
  | "abandoned";

// ---------------------------------------------------------------------------
// Domain 6.2 — AdvocateCopilotDraft
// ---------------------------------------------------------------------------

/**
 * Owned by: Domain 6.2 Agency Reporting (probable)
 * [INFERRED domain number — CODING_CONTEXT.md lists "6.2 Agency Reporting";
 *  copilot draft output fits here but requires Notion spec confirmation.]
 * [INFERRED values] Confirm against Notion domain 6.2 spec before execution pass.
 */
export type AdvocateCopilotDraftStatus =
  | "draft"
  | "sent"
  | "discarded";
