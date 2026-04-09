/**
 * Domain 3.1 — Applicant Domain: trusted helper access data layer.
 *
 * Pure data access — no policy checks.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import type { TrustedHelperAccessRecord, TrustedHelperScopeAction } from "./types";

const VALID_SCOPE_ACTIONS: TrustedHelperScopeAction[] = [
  "intake:view",
  "intake:edit",
  "documents:upload",
  "messages:read",
  "profile:view",
];

function validateScope(scope: string[]): void {
  const invalid = scope.filter((s) => !VALID_SCOPE_ACTIONS.includes(s as TrustedHelperScopeAction));
  if (invalid.length > 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid scope values: ${invalid.join(", ")}. Allowed: ${VALID_SCOPE_ACTIONS.join(", ")}`,
    );
  }
}

export async function grantTrustedHelperAccess(
  applicantUserId: string,
  helperUserId: string,
  scope: string[],
  grantedByUserId: string,
  notes: string | null,
  supabase: SupabaseClient,
): Promise<TrustedHelperAccessRecord> {
  validateScope(scope);

  // Check for existing active grant
  const existing = await resolveActiveGrant(applicantUserId, helperUserId, supabase);
  if (existing) {
    throw new AppError(
      "VALIDATION_ERROR",
      "An active trusted helper grant already exists for this pair.",
    );
  }

  const { data, error } = await supabase
    .from("trusted_helper_access")
    .insert({
      applicant_user_id: applicantUserId,
      helper_user_id: helperUserId,
      granted_scope: scope,
      granted_by_user_id: grantedByUserId,
      notes,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError(
      "INTERNAL",
      `Failed to grant trusted helper access: ${error?.message ?? "no data"}`,
    );
  }

  return data as TrustedHelperAccessRecord;
}

export async function acceptTrustedHelperGrant(
  grantId: string,
  helperUserId: string,
  supabase: SupabaseClient,
): Promise<TrustedHelperAccessRecord> {
  const { data, error } = await supabase
    .from("trusted_helper_access")
    .update({
      status: "active",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", grantId)
    .eq("helper_user_id", helperUserId)
    .eq("status", "pending")
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError(
      "NOT_FOUND",
      "Grant not found or not in pending status for this helper.",
    );
  }

  return data as TrustedHelperAccessRecord;
}

export async function revokeTrustedHelperAccess(
  grantId: string,
  revokerUserId: string,
  supabase: SupabaseClient,
): Promise<TrustedHelperAccessRecord> {
  // Verify revoker is the applicant
  const { data: grant } = await supabase
    .from("trusted_helper_access")
    .select("*")
    .eq("id", grantId)
    .maybeSingle();

  if (!grant) {
    throw new AppError("NOT_FOUND", "Trusted helper grant not found.");
  }

  const record = grant as TrustedHelperAccessRecord;
  if (record.applicant_user_id !== revokerUserId) {
    throw new AppError("FORBIDDEN", "Only the applicant may revoke a trusted helper grant.");
  }

  const { data: updated, error } = await supabase
    .from("trusted_helper_access")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", grantId)
    .select("*")
    .single();

  if (error || !updated) {
    throw new AppError("INTERNAL", `Failed to revoke grant: ${error?.message ?? "no data"}`);
  }

  return updated as TrustedHelperAccessRecord;
}

export async function listHelperGrantsForApplicant(
  applicantUserId: string,
  supabase: SupabaseClient,
): Promise<TrustedHelperAccessRecord[]> {
  const { data, error } = await supabase
    .from("trusted_helper_access")
    .select("*")
    .eq("applicant_user_id", applicantUserId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError("INTERNAL", `Failed to list helper grants: ${error.message}`);
  }

  return (data ?? []) as TrustedHelperAccessRecord[];
}

export async function listGrantsForHelper(
  helperUserId: string,
  supabase: SupabaseClient,
): Promise<TrustedHelperAccessRecord[]> {
  const { data, error } = await supabase
    .from("trusted_helper_access")
    .select("*")
    .eq("helper_user_id", helperUserId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError("INTERNAL", `Failed to list grants for helper: ${error.message}`);
  }

  return (data ?? []) as TrustedHelperAccessRecord[];
}

export async function resolveActiveGrant(
  applicantUserId: string,
  helperUserId: string,
  supabase: SupabaseClient,
): Promise<TrustedHelperAccessRecord | null> {
  const { data, error } = await supabase
    .from("trusted_helper_access")
    .select("*")
    .eq("applicant_user_id", applicantUserId)
    .eq("helper_user_id", helperUserId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", `Failed to resolve helper grant: ${error.message}`);
  }

  return (data as TrustedHelperAccessRecord | null) ?? null;
}
