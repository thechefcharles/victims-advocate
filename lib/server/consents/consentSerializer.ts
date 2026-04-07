/**
 * Domain 1.4 — Consent serializer.
 * Produces applicant-safe and provider-contextual views of ConsentGrant data.
 * Never exposes internal grant mechanics or security-relevant fields.
 */

import type { ConsentGrantRecord, ConsentScopeRecord, ConsentApplicantView, ConsentProviderView } from "./consentTypes";

export function serializeForApplicant(
  grant: ConsentGrantRecord,
  scope?: ConsentScopeRecord | null,
): ConsentApplicantView {
  return {
    id: grant.id,
    purpose_code: grant.purpose_code,
    shared_with: grant.granted_to_id,
    shared_with_type: grant.granted_to_type,
    linked_object_type: scope?.linked_object_type ?? null,
    linked_object_id: scope?.linked_object_id ?? null,
    doc_types_covered: scope?.doc_types_covered ?? null,
    status: grant.status,
    effective_at: grant.effective_at,
    expires_at: grant.expires_at,
    revoked_at: grant.revoked_at,
  };
}

export function serializeForProvider(
  grant: ConsentGrantRecord,
  scope?: ConsentScopeRecord | null,
): ConsentProviderView {
  return {
    id: grant.id,
    purpose_code: grant.purpose_code,
    status: grant.status,
    linked_object_type: scope?.linked_object_type ?? null,
    linked_object_id: scope?.linked_object_id ?? null,
    doc_types_covered: scope?.doc_types_covered ?? null,
    effective_at: grant.effective_at,
    expires_at: grant.expires_at,
    revoked_at: grant.revoked_at,
  };
}
