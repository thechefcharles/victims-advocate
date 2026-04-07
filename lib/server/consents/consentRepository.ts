/**
 * Domain 1.4 — Consent repository.
 * Pure data access — no business logic.
 * All operations use service_role client (passed in by caller).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ConsentGrantRecord,
  ConsentScopeRecord,
  ConsentScopeInput,
  CreateConsentGrantInput,
} from "./consentTypes";

export async function getConsentGrantById(
  supabase: SupabaseClient,
  id: string,
): Promise<ConsentGrantRecord | null> {
  const { data, error } = await supabase
    .from("consent_grants")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data as ConsentGrantRecord | null;
}

export async function listConsentGrantsByApplicant(
  supabase: SupabaseClient,
  applicantId: string,
): Promise<ConsentGrantRecord[]> {
  const { data, error } = await supabase
    .from("consent_grants")
    .select("*")
    .eq("applicant_id", applicantId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as ConsentGrantRecord[];
}

export async function findActiveConsentGrant(
  supabase: SupabaseClient,
  applicantId: string,
  grantedToId: string,
  linkedObjectId: string,
): Promise<ConsentGrantRecord | null> {
  const { data, error } = await supabase
    .from("consent_grants")
    .select("id, applicant_id, granted_to_type, granted_to_id, purpose_code, status, effective_at, expires_at, created_at, revoked_at, revoked_by, created_by")
    .eq("applicant_id", applicantId)
    .eq("granted_to_id", grantedToId)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return null;

  // Verify the grant covers this linked object via consent_scopes
  const grant = data as ConsentGrantRecord;
  const { data: scope } = await supabase
    .from("consent_scopes")
    .select("id")
    .eq("grant_id", grant.id)
    .eq("linked_object_id", linkedObjectId)
    .maybeSingle();
  if (!scope) return null;

  return grant;
}

export async function createConsentGrantRecord(
  supabase: SupabaseClient,
  input: CreateConsentGrantInput,
): Promise<ConsentGrantRecord> {
  const { data, error } = await supabase
    .from("consent_grants")
    .insert({
      applicant_id: input.applicant_id,
      granted_to_type: input.granted_to_type,
      granted_to_id: input.granted_to_id,
      purpose_code: input.purpose_code,
      status: "active",
      expires_at: input.expires_at ?? null,
      created_by: input.applicant_id,
    })
    .select("*")
    .single();
  if (error) throw new Error(`consent_grants insert failed: ${error.message}`);
  return data as ConsentGrantRecord;
}

export async function createConsentScopeRecord(
  supabase: SupabaseClient,
  grantId: string,
  scope: ConsentScopeInput,
): Promise<ConsentScopeRecord> {
  const { data, error } = await supabase
    .from("consent_scopes")
    .insert({
      grant_id: grantId,
      linked_object_type: scope.linked_object_type,
      linked_object_id: scope.linked_object_id,
      doc_types_covered: scope.doc_types_covered ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`consent_scopes insert failed: ${error.message}`);
  return data as ConsentScopeRecord;
}

export async function revokeConsentGrantRecord(
  supabase: SupabaseClient,
  id: string,
  revokedBy: string,
  reason?: string,
): Promise<ConsentGrantRecord> {
  const revokedAt = new Date().toISOString();

  // Update grant status
  const { data, error } = await supabase
    .from("consent_grants")
    .update({ status: "revoked", revoked_at: revokedAt, revoked_by: revokedBy })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`consent_grants revoke failed: ${error.message}`);

  // Append-only revocation record
  await supabase
    .from("consent_revocations")
    .insert({ grant_id: id, revoked_by: revokedBy, reason: reason ?? null, revoked_at: revokedAt });

  return data as ConsentGrantRecord;
}

export function isConsentExpired(grant: ConsentGrantRecord): boolean {
  if (!grant.expires_at) return false;
  return new Date(grant.expires_at) < new Date();
}
