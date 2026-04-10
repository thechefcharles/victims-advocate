/**
 * Domain 5.1 — Trusted Helper / Delegate Access types.
 *
 * Normalizes the Domain 3.1 trusted_helper_access table with:
 *   - Explicit status enum (pending | active | revoked | expired)
 *   - HelperRelationshipType enum
 *   - HelperGrantedScope — typed jsonb shape (NOT a free-form blob)
 *   - HelperAccessDecision — the runtime authorization result
 *
 * Data class: Class A — Restricted.
 */

// ---------------------------------------------------------------------------
// Status enum
// ---------------------------------------------------------------------------

export const TRUSTED_HELPER_ACCESS_STATUSES = [
  "pending",
  "active",
  "revoked",
  "expired",
] as const;

export type TrustedHelperAccessStatus = (typeof TRUSTED_HELPER_ACCESS_STATUSES)[number];

/** Terminal statuses — no further transitions allowed. */
export const TRUSTED_HELPER_TERMINAL_STATUSES = new Set<TrustedHelperAccessStatus>([
  "revoked",
  "expired",
]);

// ---------------------------------------------------------------------------
// Relationship type enum
// ---------------------------------------------------------------------------

export const HELPER_RELATIONSHIP_TYPES = [
  "guardian",
  "family_member",
  "advocate_assisted",
  "trusted_contact",
  "other_approved_helper",
] as const;

export type HelperRelationshipType = (typeof HELPER_RELATIONSHIP_TYPES)[number];

// ---------------------------------------------------------------------------
// Granted scope — typed jsonb shape (required)
// ---------------------------------------------------------------------------

/**
 * Explicit scope shape. MUST NOT be a free-form JSON blob.
 *
 * - allowedActions: registered action strings the helper can perform on behalf of the applicant
 * - allowedDomains: domain names the helper can access (e.g. 'applicant', 'support_request', 'case')
 * - caseRestriction: optional case ID to limit scope to a single case
 * - viewOnly: if true, the helper may only perform read-only actions
 */
export interface HelperGrantedScope {
  allowedActions: string[];
  allowedDomains: string[];
  caseRestriction?: string;
  viewOnly?: boolean;
}

/** An empty scope — the helper has no permissions. */
export const EMPTY_HELPER_SCOPE: HelperGrantedScope = {
  allowedActions: [],
  allowedDomains: [],
};

export function isEmptyHelperScope(scope: HelperGrantedScope): boolean {
  return scope.allowedActions.length === 0 && scope.allowedDomains.length === 0;
}

// ---------------------------------------------------------------------------
// Runtime decision object
// ---------------------------------------------------------------------------

export type HelperAccessDeniedReason =
  | "no_grant"
  | "revoked"
  | "expired"
  | "out_of_scope";

export type HelperAccessDecision = {
  allowed: boolean;
  grantId: string | null;
  deniedReason: HelperAccessDeniedReason | null;
};

// ---------------------------------------------------------------------------
// DB row shapes
// ---------------------------------------------------------------------------

export type TrustedHelperAccessRow = {
  id: string;
  applicant_user_id: string;
  helper_user_id: string;
  relationship_type: HelperRelationshipType | null;
  /** Legacy text[] column — kept for backwards compat with Domain 3.1 reads. */
  granted_scope: string[];
  /** Canonical structured scope — source of truth as of Domain 5.1. */
  granted_scope_detail: HelperGrantedScope;
  status: TrustedHelperAccessStatus;
  granted_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  granted_by_user_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TrustedHelperEventType =
  | "granted"
  | "accepted"
  | "revoked"
  | "expired"
  | "scope_updated"
  | "access_denied";

export type TrustedHelperEventRow = {
  id: string;
  grant_id: string;
  event_type: TrustedHelperEventType;
  previous_status: string | null;
  new_status: string | null;
  metadata: Record<string, unknown>;
  actor_user_id: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Service input shapes
// ---------------------------------------------------------------------------

export type CreateTrustedHelperAccessInput = {
  applicant_user_id: string;
  helper_user_id: string;
  relationship_type?: HelperRelationshipType | null;
  granted_scope_detail: HelperGrantedScope;
  expires_at?: string | null;
  notes?: string | null;
};

export type UpdateScopeInput = {
  granted_scope_detail: HelperGrantedScope;
};
