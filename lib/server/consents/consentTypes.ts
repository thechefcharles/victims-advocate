/**
 * Domain 1.4 — Consent sub-domain TypeScript types.
 *
 * Data class: A — Restricted (VOCA/VAWA victim-identifying data).
 * All consent records are owned by the applicant and must never be hard-deleted.
 */

import type { ConsentGrantStatus } from "@/lib/registry";

// ---------------------------------------------------------------------------
// DB row shapes (mirrors table definitions in migration 20260502200000)
// ---------------------------------------------------------------------------

export interface ConsentGrantRecord {
  id: string;
  applicant_id: string;
  granted_to_type: "organization" | "agency" | "platform_admin";
  granted_to_id: string;
  purpose_code: string;
  status: ConsentGrantStatus;
  effective_at: string;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  created_by: string | null;
}

export interface ConsentScopeRecord {
  id: string;
  grant_id: string;
  linked_object_type: "case" | "support_request" | "referral";
  linked_object_id: string;
  doc_types_covered: string[] | null;
  created_at: string;
}

export interface ConsentRevocationRecord {
  id: string;
  grant_id: string;
  revoked_by: string;
  reason: string | null;
  revoked_at: string;
}

// ---------------------------------------------------------------------------
// Service I/O types
// ---------------------------------------------------------------------------

export interface ConsentScopeInput {
  linked_object_type: "case" | "support_request" | "referral";
  linked_object_id: string;
  doc_types_covered?: string[] | null;
}

export interface CreateConsentGrantInput {
  applicant_id: string;
  granted_to_type: "organization" | "agency" | "platform_admin";
  granted_to_id: string;
  purpose_code: string;
  scope: ConsentScopeInput;
  expires_at?: string | null;
}

export interface RevokeConsentGrantInput {
  reason?: string;
}

// ---------------------------------------------------------------------------
// Serializer output types (no internal grant mechanics)
// ---------------------------------------------------------------------------

export interface ConsentApplicantView {
  id: string;
  purpose_code: string;
  shared_with: string;
  shared_with_type: string;
  linked_object_type: string | null;
  linked_object_id: string | null;
  doc_types_covered: string[] | null;
  status: ConsentGrantStatus;
  effective_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface ConsentProviderView {
  id: string;
  purpose_code: string;
  status: ConsentGrantStatus;
  linked_object_type: string | null;
  linked_object_id: string | null;
  doc_types_covered: string[] | null;
  effective_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}
