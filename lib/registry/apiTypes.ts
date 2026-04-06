/**
 * API surface types — canonical registry for NxtStps 2.0.
 *
 * ApiErrorCode is ADDITIVE: it includes every existing code from
 * lib/server/api/errors.ts AND every new canonical code from the 2.0 spec.
 * Renamed codes include BOTH the legacy and canonical name; the legacy name
 * carries a @deprecated JSDoc.
 *
 * Do NOT rename existing codes in lib/server/api/errors.ts — the rename
 * pass is deferred. This registry defines the target shape only.
 *
 * Authority: docs/AGENTS.md + docs/CODING_CONTEXT.md (Notion bridge).
 * Data classification definitions are sourced from CODING_CONTEXT.md Part 2.
 */

// ---------------------------------------------------------------------------
// ApiErrorCode
// ---------------------------------------------------------------------------

/**
 * Complete set of API error codes for NxtStps 2.0.
 *
 * Legacy codes (AUTH_REQUIRED, INTERNAL) are preserved and marked deprecated.
 * New canonical codes are additive — they do not exist in errors.ts yet.
 * Domain-specific codes (DOCUMENT_*, ACCOUNT_*, EMAIL_*) are preserved;
 * they are real codes in production use and must not be removed.
 */
export type ApiErrorCode =
  // --- Authentication ---
  /** @deprecated Use UNAUTHENTICATED instead. Maps to HTTP 401. */
  | "AUTH_REQUIRED"
  /** Canonical 2.0 name for AUTH_REQUIRED. Maps to HTTP 401. */
  | "UNAUTHENTICATED"

  // --- Authorization ---
  | "FORBIDDEN"

  // --- Resource ---
  | "NOT_FOUND"
  | "CONFLICT"

  // --- Input ---
  | "VALIDATION_ERROR"

  // --- Rate / throttle ---
  | "RATE_LIMITED"

  // --- State machine ---
  | "EXPIRED"
  | "STATE_INVALID"

  // --- Multi-tenant ---
  | "TENANT_SCOPE_MISMATCH"

  // --- Consent / policy ---
  | "CONSENT_REQUIRED"

  // --- Feature flags ---
  | "FEATURE_DISABLED"

  // --- Account lifecycle (domain-specific, in active use) ---
  | "EMAIL_VERIFICATION_REQUIRED"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_DELETED"

  // --- Document domain (domain-specific, in active use) ---
  | "DOCUMENT_ACCESS_DENIED"
  | "DOCUMENT_RESTRICTED"
  | "DOCUMENT_DELETED"
  | "DOCUMENT_UPLOAD_INVALID"

  // --- Server error ---
  /** @deprecated Use INTERNAL_ERROR instead. Maps to HTTP 500. */
  | "INTERNAL"
  /** Canonical 2.0 name for INTERNAL. Maps to HTTP 500. */
  | "INTERNAL_ERROR";

// ---------------------------------------------------------------------------
// PolicyDecisionReasonCode
// ---------------------------------------------------------------------------

/**
 * Reason codes emitted by the `can(action, actor, resource, context)`
 * policy engine. Used in policy decision logs and structured error details.
 *
 * ⚠️  [INFERRED] These values are derived from the policy engine architecture
 * and existing error codes. Confirm the full set against Notion spec
 * before the Policy Engine domain execution pass.
 */
export type PolicyDecisionReasonCode =
  | "ALLOWED"
  | "UNAUTHENTICATED"
  | "ACCOUNT_NOT_ACTIVE"
  | "EMAIL_NOT_VERIFIED"
  | "INSUFFICIENT_ROLE"
  | "TENANT_SCOPE_MISMATCH"
  | "MISSING_CONSENT"
  | "FEATURE_DISABLED"
  | "RESOURCE_NOT_FOUND"
  | "STATE_INVALID"
  | "RATE_LIMITED"
  | "SAFETY_MODE_RESTRICTED";

// ---------------------------------------------------------------------------
// VisibilityScope
// ---------------------------------------------------------------------------

/**
 * Data visibility classification for serializer boundaries.
 * Controls which fields are included in API responses based on the
 * requesting account type and context.
 *
 * Ordered from most to least permissive:
 *   public            — no auth required, safe for unauthenticated surfaces
 *   applicant_safe    — safe to show to the applicant who owns the record
 *   provider_internal — visible to provider org staff only
 *   agency_internal   — visible to agency staff only
 *   admin_only        — platform admin surfaces only
 */
export type VisibilityScope =
  | "public"
  | "applicant_safe"
  | "provider_internal"
  | "agency_internal"
  | "admin_only";

// ---------------------------------------------------------------------------
// DataClass
// ---------------------------------------------------------------------------

/**
 * Data sensitivity classification per NxtStps security policy.
 * Source of truth: docs/CODING_CONTEXT.md Part 2 — Data Classification.
 *
 *   A — Class A — Restricted:
 *       Applicant identity, case data, documents, consent, messages,
 *       safety settings, AI chat.
 *       Requires: strict RLS, server-side policy, serializer minimization,
 *       audit logging, no public caching, encrypted storage.
 *
 *   B — Class B — Sensitive Operational:
 *       Provider internal notes, audit logs, admin data, draft outputs.
 *       Requires: access controls, audit logging.
 *
 *   C — Class C — Controlled Business:
 *       Org profiles, programs, non-public events, templates.
 *       Requires: role-based access controls.
 *
 *   D — Class D — Public:
 *       Public provider profiles, public trust indicators, public resources.
 *       May be cached publicly. No PII.
 *
 * See AGENTS.md Rule 19–20 and CODING_CONTEXT.md Part 2 for Class A/B
 * compliance requirements (10 required security test categories).
 */
export type DataClass = "A" | "B" | "C" | "D";
