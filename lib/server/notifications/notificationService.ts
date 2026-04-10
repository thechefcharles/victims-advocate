/**
 * Domain 7.2 — Notification service (domain-pattern layer).
 *
 * Wraps existing query/create modules and adds missing operations.
 * All queries are user-scoped — NEVER cross-user.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { AuthContext } from "@/lib/server/auth";
import type { NotificationRow, NotificationPreferencesRow } from "./types";
import type { CreateNotificationInput } from "./notificationTypes";

// ---------------------------------------------------------------------------
// List (delegates to existing query module pattern)
// ---------------------------------------------------------------------------

export async function listNotifications(params: {
  ctx: AuthContext;
  unreadOnly?: boolean;
  includeDismissed?: boolean;
  limit?: number;
}): Promise<NotificationRow[]> {
  const { ctx, unreadOnly = false, includeDismissed = false, limit = 20 } = params;
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", ctx.userId) // CRITICAL: user-scoped
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!includeDismissed) query = query.neq("status", "dismissed");
  if (unreadOnly) query = query.neq("status", "read").neq("status", "dismissed");

  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL", `Failed to list notifications: ${error.message}`);
  return (data ?? []) as NotificationRow[];
}

// ---------------------------------------------------------------------------
// Get single
// ---------------------------------------------------------------------------

export async function getNotification(params: {
  notificationId: string;
  ctx: AuthContext;
}): Promise<NotificationRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", params.notificationId)
    .eq("user_id", params.ctx.userId) // CRITICAL: user-scoped
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", `Failed to get notification: ${error.message}`);
  return (data as NotificationRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Mark read
// ---------------------------------------------------------------------------

export async function markNotificationRead(params: {
  notificationId: string;
  ctx: AuthContext;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notifications")
    .update({
      status: "read",
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.notificationId)
    .eq("user_id", params.ctx.userId)
    .select("id");
  if (error) throw new AppError("INTERNAL", `Failed to mark read: ${error.message}`);
  if (!data?.length) throw new AppError("NOT_FOUND", "Notification not found.", undefined, 404);

  void logEvent({
    ctx: params.ctx,
    action: "notification.read",
    resourceType: "notification",
    resourceId: params.notificationId,
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Mark unread (new — not in legacy code)
// ---------------------------------------------------------------------------

export async function markNotificationUnread(params: {
  notificationId: string;
  ctx: AuthContext;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notifications")
    .update({
      status: "pending",
      read_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.notificationId)
    .eq("user_id", params.ctx.userId)
    .select("id");
  if (error) throw new AppError("INTERNAL", `Failed to mark unread: ${error.message}`);
  if (!data?.length) throw new AppError("NOT_FOUND", "Notification not found.", undefined, 404);
}

// ---------------------------------------------------------------------------
// Dismiss
// ---------------------------------------------------------------------------

export async function dismissNotification(params: {
  notificationId: string;
  ctx: AuthContext;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("notifications")
    .update({
      status: "dismissed",
      dismissed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.notificationId)
    .eq("user_id", params.ctx.userId);
  if (error) throw new AppError("INTERNAL", `Failed to dismiss: ${error.message}`);

  void logEvent({
    ctx: params.ctx,
    action: "notification.dismissed",
    resourceType: "notification",
    resourceId: params.notificationId,
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferencesRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", `Failed to get preferences: ${error.message}`);
  return (data as NotificationPreferencesRow | null) ?? null;
}

export async function updateNotificationPreferences(params: {
  userId: string;
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  muteSensitivePreviews?: boolean;
  categoryOverrides?: Record<string, unknown>;
}): Promise<NotificationPreferencesRow> {
  const supabase = getSupabaseAdmin();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (params.inAppEnabled !== undefined) updates.in_app_enabled = params.inAppEnabled;
  if (params.emailEnabled !== undefined) updates.email_enabled = params.emailEnabled;
  if (params.smsEnabled !== undefined) updates.sms_enabled = params.smsEnabled;
  if (params.muteSensitivePreviews !== undefined) updates.mute_sensitive_previews = params.muteSensitivePreviews;
  if (params.categoryOverrides !== undefined) updates.preferences = params.categoryOverrides;

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: params.userId, ...updates }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", `Failed to update preferences: ${error?.message ?? "no data"}`);
  }
  return data as NotificationPreferencesRow;
}

// ---------------------------------------------------------------------------
// Create notification (domain-pattern wrapper)
// ---------------------------------------------------------------------------

export async function createNotificationRecord(
  input: CreateNotificationInput,
): Promise<NotificationRow | null> {
  const supabase = getSupabaseAdmin();

  // Check preferences — suppress if in-app disabled.
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("in_app_enabled")
    .eq("user_id", input.recipientUserId)
    .maybeSingle();
  if (prefs && prefs.in_app_enabled === false) return null;

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: input.recipientUserId,
      organization_id: input.organizationId ?? null,
      case_id: input.caseId ?? null,
      type: input.category,
      channel: "in_app",
      status: "pending",
      title: input.title,
      body: input.body,
      action_url: input.actionUrl ?? null,
      preview_safe: true,
      metadata: {
        linked_object_type: input.linkedObjectType,
        linked_object_id: input.linkedObjectId,
        ...(input.metadata ?? {}),
      },
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return data as NotificationRow;
}
