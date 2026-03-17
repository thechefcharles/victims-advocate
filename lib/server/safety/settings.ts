import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import type { SafeNotificationMode, SafetySettings, UserSafetySettingsRow } from "./types";

export function defaultSafetySettings(userId: string): SafetySettings {
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

export async function getSafetySettings(params: { ctx: AuthContext }): Promise<SafetySettings> {
  const { ctx } = params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("user_safety_settings")
    .select("*")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL", "Failed to load safety settings", undefined, 500);
  }

  if (!data) {
    return defaultSafetySettings(ctx.userId);
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

export async function upsertSafetySettings(params: {
  ctx: AuthContext;
  patch: Partial<Omit<SafetySettings, "user_id">>;
}): Promise<SafetySettings> {
  const { ctx, patch } = params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("user_safety_settings")
    .upsert(
      {
        user_id: ctx.userId,
        updated_at: new Date().toISOString(),
        ...patch,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to update safety settings", undefined, 500);
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

export async function isSafetyModeEnabled(params: { ctx: AuthContext }): Promise<boolean> {
  const settings = await getSafetySettings({ ctx: params.ctx });
  return Boolean(settings.safety_mode_enabled);
}

export async function getSafeNotificationMode(params: { ctx: AuthContext }): Promise<SafeNotificationMode> {
  const settings = await getSafetySettings({ ctx: params.ctx });
  if (settings.safety_mode_enabled && settings.suppress_notification_previews) return "strict";
  if (settings.safety_mode_enabled) return "strict";
  if (settings.suppress_notification_previews) return "strict";
  return "normal";
}

