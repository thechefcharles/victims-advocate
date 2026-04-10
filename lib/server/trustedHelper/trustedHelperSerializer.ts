/**
 * Domain 5.1 — Trusted helper serializers.
 *
 * Three context-aware views:
 *   serializeForApplicant  — management view (scope summary, revoke controls)
 *   serializeForHelperSelf — "you have access to X's account" view, scope-limited
 *   serializeForAdmin      — full metadata + status history access
 */

import type { TrustedHelperAccessRow, HelperGrantedScope } from "./trustedHelperTypes";

// ---------------------------------------------------------------------------
// Plain-language scope summary (for applicant-facing display)
// ---------------------------------------------------------------------------

function describeScope(scope: HelperGrantedScope): string {
  const parts: string[] = [];
  if (scope.viewOnly) parts.push("view-only");
  if (scope.allowedDomains.length > 0) {
    parts.push(`can access: ${scope.allowedDomains.join(", ")}`);
  }
  if (scope.allowedActions.length > 0) {
    parts.push(`${scope.allowedActions.length} actions permitted`);
  }
  if (scope.caseRestriction) {
    parts.push(`limited to case ${scope.caseRestriction}`);
  }
  if (parts.length === 0) return "no permissions";
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// Applicant management view
// ---------------------------------------------------------------------------

export type ApplicantHelperView = {
  id: string;
  helper_user_id: string;
  relationship_type: string | null;
  status: string;
  scope_summary: string;
  allowed_actions: string[];
  allowed_domains: string[];
  view_only: boolean;
  granted_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  notes: string | null;
};

export function serializeForApplicant(row: TrustedHelperAccessRow): ApplicantHelperView {
  return {
    id: row.id,
    helper_user_id: row.helper_user_id,
    relationship_type: row.relationship_type,
    status: row.status,
    scope_summary: describeScope(row.granted_scope_detail),
    allowed_actions: row.granted_scope_detail.allowedActions ?? [],
    allowed_domains: row.granted_scope_detail.allowedDomains ?? [],
    view_only: row.granted_scope_detail.viewOnly === true,
    granted_at: row.granted_at,
    accepted_at: row.accepted_at,
    revoked_at: row.revoked_at,
    expires_at: row.expires_at,
    notes: row.notes,
  };
}

// ---------------------------------------------------------------------------
// Helper self-view (scope-limited — not the same as applicant self)
// ---------------------------------------------------------------------------

export type HelperSelfView = {
  id: string;
  applicant_user_id: string;
  relationship_type: string | null;
  status: string;
  scope_summary: string;
  allowed_domains: string[];
  view_only: boolean;
  granted_at: string;
  accepted_at: string | null;
  expires_at: string | null;
};

/**
 * The helper's own view of the grant. Exposes:
 *   - that access exists and is active
 *   - what scope is granted (plain-language)
 *   - applicant ID (so the helper knows who they're acting for)
 *
 * Does NOT expose:
 *   - revoked_at, notes (internal / potentially sensitive)
 *   - the full allowed_actions list (summary only)
 */
export function serializeForHelperSelf(row: TrustedHelperAccessRow): HelperSelfView {
  return {
    id: row.id,
    applicant_user_id: row.applicant_user_id,
    relationship_type: row.relationship_type,
    status: row.status,
    scope_summary: describeScope(row.granted_scope_detail),
    allowed_domains: row.granted_scope_detail.allowedDomains ?? [],
    view_only: row.granted_scope_detail.viewOnly === true,
    granted_at: row.granted_at,
    accepted_at: row.accepted_at,
    expires_at: row.expires_at,
  };
}

// ---------------------------------------------------------------------------
// Admin view (full row + history)
// ---------------------------------------------------------------------------

export function serializeForAdmin(row: TrustedHelperAccessRow): TrustedHelperAccessRow {
  return { ...row };
}
