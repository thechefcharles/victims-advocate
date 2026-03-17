export type NotificationChannel = "in_app" | "email" | "sms";

export type NotificationStatus =
  | "pending"
  | "delivered"
  | "read"
  | "dismissed"
  | "failed";

export type NotificationRow = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  organization_id: string | null;
  case_id: string | null;
  type: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  body: string | null;
  action_url: string | null;
  preview_safe: boolean;
  metadata: Record<string, unknown>;
  read_at: string | null;
  dismissed_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
};

export type NotificationPreferencesRow = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  mute_sensitive_previews: boolean;
  preferences: Record<string, unknown>;
};

