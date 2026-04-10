/**
 * Domain 3.1 — Applicant Domain: profile data access layer.
 *
 * Pure data access — no policy checks. No business logic.
 * All policy authorization happens in applicantProfileService.ts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import type { ApplicantProfileRecord } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Key identity fields used for profile completion scoring.
 * Score = (filled / COMPLETION_FIELDS.length) * 100, rounded.
 */
const COMPLETION_FIELDS: (keyof ApplicantProfileRecord)[] = [
  "preferred_name",
  "legal_first_name",
  "legal_last_name",
  "cell_phone",
  "city",
  "state",
  "zip",
  "date_of_birth",
];

export function computeProfileCompletionPct(
  profile: Partial<ApplicantProfileRecord>,
): number {
  const filled = COMPLETION_FIELDS.filter(
    (f) => profile[f] !== null && profile[f] !== undefined && profile[f] !== "",
  ).length;
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function resolveApplicantByUserId(
  userId: string,
  supabase: SupabaseClient,
): Promise<ApplicantProfileRecord | null> {
  const { data, error } = await supabase
    .from("applicant_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", `Failed to resolve applicant profile: ${error.message}`);
  }

  return (data as ApplicantProfileRecord | null) ?? null;
}

export async function getApplicantProfileByUserId(
  userId: string,
  supabase: SupabaseClient,
): Promise<ApplicantProfileRecord | null> {
  return resolveApplicantByUserId(userId, supabase);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function upsertApplicantProfile(
  userId: string,
  fields: Partial<Omit<ApplicantProfileRecord, "id" | "user_id" | "created_at" | "updated_at">>,
  supabase: SupabaseClient,
): Promise<ApplicantProfileRecord> {
  const completionPct = computeProfileCompletionPct({ user_id: userId, ...fields });

  const { data, error } = await supabase
    .from("applicant_profiles")
    .upsert(
      {
        user_id: userId,
        ...fields,
        profile_completion_pct: completionPct,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError("INTERNAL", `Failed to upsert applicant profile: ${error?.message ?? "no data"}`);
  }

  // Dual-write: keep profiles.personal_info jsonb in sync for back-compat
  await syncPersonalInfoJsonb(userId, fields, supabase);

  return data as ApplicantProfileRecord;
}

/**
 * Maps ApplicantProfileRecord fields onto the profiles.personal_info jsonb.
 * Only overlapping fields are written — unrelated jsonb fields are preserved.
 * Non-overlapping fields (profile_completion_pct) are NOT written to jsonb.
 */
export async function syncPersonalInfoJsonb(
  userId: string,
  fields: Partial<ApplicantProfileRecord>,
  supabase: SupabaseClient,
): Promise<void> {
  // Build the jsonb-compatible patch (field names match personalInfo.ts schema)
  const patch: Record<string, unknown> = {};
  if (fields.preferred_name !== undefined) patch.preferredName = fields.preferred_name;
  if (fields.legal_first_name !== undefined) patch.firstName = fields.legal_first_name;
  if (fields.legal_last_name !== undefined) patch.lastName = fields.legal_last_name;
  if (fields.pronouns !== undefined) patch.pronouns = fields.pronouns;
  if (fields.gender_identity !== undefined) patch.genderIdentity = fields.gender_identity;
  if (fields.date_of_birth !== undefined) patch.dateOfBirth = fields.date_of_birth;
  if (fields.ethnicity !== undefined) patch.ethnicity = fields.ethnicity;
  if (fields.race !== undefined) patch.race = fields.race;
  if (fields.street_address !== undefined) patch.streetAddress = fields.street_address;
  if (fields.apt !== undefined) patch.apt = fields.apt;
  if (fields.city !== undefined) patch.city = fields.city;
  if (fields.state !== undefined) patch.state = fields.state;
  if (fields.zip !== undefined) patch.zip = fields.zip;
  if (fields.cell_phone !== undefined) patch.cellPhone = fields.cell_phone;
  if (fields.alternate_phone !== undefined) patch.alternatePhone = fields.alternate_phone;
  if (fields.occupation !== undefined) patch.occupation = fields.occupation;
  if (fields.education_level !== undefined) patch.educationLevel = fields.education_level;
  if (fields.interpreter_needed !== undefined) patch.interpreterNeeded = fields.interpreter_needed;
  if (fields.preferred_contact_method !== undefined)
    patch.preferredContactMethod = fields.preferred_contact_method;

  if (Object.keys(patch).length === 0) return;

  // Fetch current jsonb, merge patch, write back
  const { data: row } = await supabase
    .from("profiles")
    .select("personal_info")
    .eq("id", userId)
    .maybeSingle();

  const merged = { ...(row?.personal_info ?? {}), ...patch };

  await supabase
    .from("profiles")
    .update({ personal_info: merged, updated_at: new Date().toISOString() })
    .eq("id", userId);
  // Dual-write errors are non-fatal — primary write to applicant_profiles succeeded
}
