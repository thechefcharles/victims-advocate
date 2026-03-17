export type UserSafetySettingsRow = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  safety_mode_enabled: boolean;
  hide_sensitive_labels: boolean;
  suppress_notification_previews: boolean;
  clear_local_state_on_quick_exit: boolean;
  reduced_dashboard_visibility: boolean;
  metadata: Record<string, unknown>;
};

export type SafetySettings = Omit<UserSafetySettingsRow, "id" | "created_at" | "updated_at">;

export type SafeNotificationMode = "normal" | "strict";

