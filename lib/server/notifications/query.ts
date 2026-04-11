import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { NotificationRow } from "./types";

function sortNotificationsForDisplay(rows: NotificationRow[]): NotificationRow[] {
  const isUnread = (status: string) => status !== "read" && status !== "dismissed";
  const rank = (type: string, status: string) => {
    if (type === "applicant_connection_request_pending" && isUnread(status)) return 0;
    if (type === "advocate_connection_request" && isUnread(status)) return 1;
    if (type === "advocate_org_join_request" && isUnread(status)) return 2;
    if (type === "org_rep_join_request" && isUnread(status)) return 2;
    return 3;
  };
  return [...rows].sort((a, b) => {
    const diff = rank(a.type, a.status) - rank(b.type, b.status);
    if (diff !== 0) return diff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function listNotificationsForUser(params: {
  ctx: AuthContext;
  unreadOnly?: boolean;
  /** When false (default), dismissed rows are omitted so the Updates list stays actionable. */
  includeDismissed?: boolean;
  limit?: number;
}): Promise<NotificationRow[]> {
  const { ctx, unreadOnly = false, includeDismissed = false, limit = 20 } = params;
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!includeDismissed) {
    query = query.neq("status", "dismissed");
  }

  if (unreadOnly) {
    query = query.neq("status", "read").neq("status", "dismissed");
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError("INTERNAL", "Failed to list notifications", undefined, 500);
  }
  return sortNotificationsForDisplay((data ?? []) as NotificationRow[]);
}

export async function markNotificationRead(params: {
  notificationId: string;
  ctx: AuthContext;
}): Promise<void> {
  const { notificationId, ctx } = params;
  const supabase = getSupabaseAdmin();

  const { data: updatedRows, error } = await supabase
    .from("notifications")
    .update({
      status: "read",
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", ctx.userId)
    .select("id");

  if (error) {
    throw new AppError("INTERNAL", "Failed to mark notification read", undefined, 500);
  }
  if (!updatedRows?.length) {
    throw new AppError("NOT_FOUND", "Notification not found", undefined, 404);
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

