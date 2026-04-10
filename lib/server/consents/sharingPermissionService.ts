/**
 * Domain 1.4 — Sharing permission bridge.
 *
 * Called by documentService.shareDocument() before any document sharing action.
 * This is the MANDATORY consent gate between the Documents and Consent sub-domains.
 *
 * Data class: A — Restricted.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConsentGrantRecord } from "./consentTypes";
import {
  findActiveConsentGrant,
  isConsentExpired,
} from "./consentRepository";

export interface SharingAllowedResult {
  allowed: boolean;
  grantId?: string;
  reason?: string;
}

export interface IsSharingAllowedParams {
  applicantId: string;
  recipientOrgId: string;
  linkedObjectType: string;
  linkedObjectId: string;
  docType?: string;
}

/**
 * Returns whether a provider org is allowed to access documents for an applicant
 * on a specific workflow object (case / support request / referral).
 *
 * Checks:
 *  1. Active ConsentGrant exists for applicant → recipientOrg covering linkedObject.
 *  2. Grant is not expired.
 *  3. If doc_types_covered is set, docType must be in the list.
 */
export async function isSharingAllowed(
  supabase: SupabaseClient,
  params: IsSharingAllowedParams,
): Promise<SharingAllowedResult> {
  const { applicantId, recipientOrgId, linkedObjectId, docType } = params;

  const grant = await findActiveConsentGrant(
    supabase,
    applicantId,
    recipientOrgId,
    linkedObjectId,
  );

  if (!grant) {
    return { allowed: false, reason: "no_active_grant" };
  }

  if (isConsentExpired(grant)) {
    return { allowed: false, reason: "grant_expired" };
  }

  // Check doc type scope if grant has a specific list
  if (docType) {
    const { data: scope } = await supabase
      .from("consent_scopes")
      .select("doc_types_covered")
      .eq("grant_id", grant.id)
      .maybeSingle();

    if (scope?.doc_types_covered && !scope.doc_types_covered.includes(docType)) {
      return { allowed: false, reason: "doc_type_not_covered" };
    }
  }

  return { allowed: true, grantId: grant.id };
}

export async function resolveActiveConsent(
  supabase: SupabaseClient,
  params: IsSharingAllowedParams,
): Promise<ConsentGrantRecord | null> {
  return findActiveConsentGrant(
    supabase,
    params.applicantId,
    params.recipientOrgId,
    params.linkedObjectId,
  );
}

export async function validateConsentScope(
  supabase: SupabaseClient,
  grantId: string,
  requestedAccess: { linkedObjectId: string; docType?: string },
): Promise<boolean> {
  const { data: scope } = await supabase
    .from("consent_scopes")
    .select("linked_object_id, doc_types_covered")
    .eq("grant_id", grantId)
    .eq("linked_object_id", requestedAccess.linkedObjectId)
    .maybeSingle();

  if (!scope) return false;
  if (requestedAccess.docType && scope.doc_types_covered) {
    return scope.doc_types_covered.includes(requestedAccess.docType);
  }
  return true;
}
