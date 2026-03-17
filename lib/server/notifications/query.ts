import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { NotificationRow } from "./types";

export async function listNotificationsForUser(params: {
  ctx: AuthContext;
  unreadOnly?: boolean;
  limit?: number;
}): Promise<NotificationRow[]> {
  const { ctx, unreadOnly = false, limit = 20 } = params;
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.neq("status", "read").neq("status", "dismissed");
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError("INTERNAL", "Failed to list notifications", undefined, 500);
  }
  return (data ?? []) as NotificationRow[];
}

export async function markNotificationRead(params: {
  notificationId: string;
  ctx: AuthContext;
}): Promise<void> {
  const { notificationId, ctx } = params;
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("notifications")
    .update({
      status: "read",
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", ctx.userId);

  if (error) {
    throw new AppError("INTERNAL", "Failed to mark notification read", undefined, 500);
  }

  await logEvent({
    ctx,
    action: "notification.read",
    resourceType: "notification",
    resourceId: notificationId,
    organizationId: ctx.orgId,
  });
}

export async function dismissNotification(params: {
  notificationId: string;
  ctx: AuthContext;
}): Promise<void> {
  const { notificationId, ctx } = params;
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("notifications")
    .update({
      status: "dismissed",
      dismissed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", ctx.userId);

  if (error) {
    throw new AppError("INTERNAL", "Failed to dismiss notification", undefined, 500);
  }

  await logEvent({
    ctx,
    action: "notification.dismissed",
    resourceType: "notification",
    resourceId: notificationId,
    organizationId: ctx.orgId,
  });
}

