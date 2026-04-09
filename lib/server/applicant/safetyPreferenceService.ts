/**
 * Domain 3.1 — Applicant Domain: safety preference service (canonical implementation).
 *
 * The existing lib/server/safety/settings.ts becomes a re-export shim pointing here.
 * All safety preference logic lives in this file going forward.
 *
 * The underlying DB table remains user_safety_settings (unchanged per Decision 1).
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type { SafetySettings, UserSafetySettingsRow, SafeNotificationMode } from "@/lib/server/safety/types";

export function defaultSafetyPreference(userId: string): SafetySettings {
  return {
    user_id: userId,
    safety_mode_enabled: false,
    hide_sensitive_labels: true,
    suppress_notification_previews: true,
    clear_local_state_on_quick_exit: true,
    reduced_dashboard_visibility: true,
    metadata: {},
  };
}

export async function getSafetyPreference(userId: string): Promise<SafetySettings> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("user_safety_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Failed to load safety preference", undefined, 500);
  }

  if (!data) {
    return defaultSafetyPreference(userId);
  }

  const row = data as UserSafetySettingsRow;
  return {
    user_id: row.user_id,
    safety_mode_enabled: Boolean(row.safety_mode_enabled),
    hide_sensitive_labels: Boolean(row.hide_sensitive_labels),
    suppress_notification_previews: Boolean(row.suppress_notification_previews),
    clear_local_state_on_quick_exit: Boolean(row.clear_local_state_on_quick_exit),
    reduced_dashboard_visibility: Boolean(row.reduced_dashboard_visibility),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

export async function upsertSafetyPreference(
  userId: string,
  patch: Partial<Omit<SafetySettings, "user_id">>,
): Promise<SafetySettings> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("user_safety_settings")
    .upsert(
      {
        user_id: userId,
        updated_at: new Date().toISOString(),
        ...patch,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to update safety preference", undefined, 500);
  }

  const row = data as UserSafetySettingsRow;
  return {
    user_id: row.user_id,
    safety_mode_enabled: Boolean(row.safety_mode_enabled),
    hide_sensitive_labels: Boolean(row.hide_sensitive_labels),
    suppress_notification_previews: Boolean(row.suppress_notification_previews),
    clear_local_state_on_quick_exit: Boolean(row.clear_local_state_on_quick_exit),
    reduced_dashboard_visibility: Boolean(row.reduced_dashboard_visibility),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

export async function getSafeNotificationMode(userId: string): Promise<SafeNotificationMode> {
  const settings = await getSafetyPreference(userId);
  if (settings.safety_mode_enabled && settings.suppress_notification_previews) return "strict";
  if (settings.safety_mode_enabled) return "strict";
  if (settings.suppress_notification_previews) return "strict";
  return "normal";
}

// Re-export types for callers who import from this module
export type { SafetySettings, SafeNotificationMode } from "@/lib/server/safety/types";
