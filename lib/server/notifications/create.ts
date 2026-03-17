import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { NotificationChannel, NotificationRow } from "./types";

type BaseCreateInput = {
  userId: string;
  organizationId?: string | null;
  caseId?: string | null;
  type: string;
  channel?: NotificationChannel;
  title: string;
  body?: string | null;
  actionUrl?: string | null;
  previewSafe?: boolean;
  metadata?: Record<string, unknown>;
};

export async function createNotification(
  input: BaseCreateInput,
  ctx: AuthContext | null
): Promise<NotificationRow | null> {
  const supabase = getSupabaseAdmin();
  const {
    userId,
    organizationId = null,
    caseId = null,
    type,
    channel = "in_app",
    title,
    body = null,
    actionUrl = null,
    previewSafe = true,
    metadata = {},
  } = input;

  try {
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("in_app_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (channel === "in_app" && prefs && prefs.in_app_enabled === false) {
      return null;
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        organization_id: organizationId,
        case_id: caseId,
        type,
        channel,
        status: "pending",
        title,
        body,
        action_url: actionUrl,
        preview_safe: previewSafe,
        metadata,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError("INTERNAL", "Failed to create notification", undefined, 500);
    }

    const row = data as NotificationRow;

    await logEvent({
      ctx,
      action: "notification.created",
      resourceType: "notification",
      resourceId: row.id,
      organizationId,
      metadata: {
        type,
        caseId,
        channel,
      },
    });

    return row;
  } catch (e) {
    console.error("Notification creation failed:", e);
    return null;
  }
}

export async function createCaseNotification(
  params: {
    recipients: string[];
    caseId: string | null;
    organizationId: string | null;
    type: string;
    title: string;
    body?: string | null;
    actionUrl?: string | null;
    previewSafe?: boolean;
    metadata?: Record<string, unknown>;
  },
  ctx: AuthContext | null
): Promise<void> {
  const { recipients, caseId, organizationId, type, title, body, actionUrl, previewSafe, metadata } =
    params;
  await Promise.all(
    recipients.map((userId) =>
      createNotification(
        {
          userId,
          organizationId,
          caseId,
          type,
          title,
          body,
          actionUrl,
          previewSafe,
          metadata,
        },
        ctx
      )
    )
  );
}

