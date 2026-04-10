/**
 * Domain 3.1 — Applicant Domain: preference data access layer.
 *
 * Pure data access — no policy checks.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import type {
  ApplicantPreferenceRecord,
  AccessibilityMode,
  NotificationChannelPreference,
} from "./types";

const VALID_ACCESSIBILITY_MODES: AccessibilityMode[] = [
  "high_contrast",
  "large_text",
  "screen_reader",
  "none",
];

const VALID_NOTIFICATION_CHANNELS: NotificationChannelPreference[] = [
  "email",
  "sms",
  "in_app",
];

function validateFields(
  fields: Partial<ApplicantPreferenceRecord>,
): void {
  if (
    fields.accessibility_mode !== undefined &&
    !VALID_ACCESSIBILITY_MODES.includes(fields.accessibility_mode as AccessibilityMode)
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid accessibility_mode: ${fields.accessibility_mode}`,
    );
  }
  if (
    fields.notification_channel_preference !== undefined &&
    !VALID_NOTIFICATION_CHANNELS.includes(
      fields.notification_channel_preference as NotificationChannelPreference,
    )
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid notification_channel_preference: ${fields.notification_channel_preference}`,
    );
  }
}

export async function getApplicantPreferences(
  userId: string,
  supabase: SupabaseClient,
): Promise<ApplicantPreferenceRecord | null> {
  const { data, error } = await supabase
    .from("applicant_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", `Failed to get applicant preferences: ${error.message}`);
  }

  return (data as ApplicantPreferenceRecord | null) ?? null;
}

export async function upsertApplicantPreferences(
  userId: string,
  fields: Partial<Omit<ApplicantPreferenceRecord, "id" | "user_id" | "created_at" | "updated_at">>,
  supabase: SupabaseClient,
): Promise<ApplicantPreferenceRecord> {
  validateFields(fields as Partial<ApplicantPreferenceRecord>);

  const { data, error } = await supabase
    .from("applicant_preferences")
    .upsert(
      {
        user_id: userId,
        ...fields,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError(
      "INTERNAL",
      `Failed to upsert applicant preferences: ${error?.message ?? "no data"}`,
    );
  }

  return data as ApplicantPreferenceRecord;
}
