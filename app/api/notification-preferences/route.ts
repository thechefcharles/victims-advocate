/**
 * GET  /api/notification-preferences — view own preferences
 * PUT  /api/notification-preferences — update own preferences
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/server/notifications/notificationService";
import { serializePreferences } from "@/lib/server/notifications/notificationSerializer";
import { z } from "zod";

const updateBody = z.object({
  in_app_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  sms_enabled: z.boolean().optional(),
  mute_sensitive_previews: z.boolean().optional(),
  category_overrides: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("notification:preference.view", actor, {
      type: "notification_preference", id: null, ownerId: ctx.userId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const prefs = await getNotificationPreferences(ctx.userId);
    if (!prefs) {
      return apiOk({
        preferences: {
          inAppEnabled: true,
          emailEnabled: false,
          smsEnabled: false,
          muteSensitivePreviews: true,
          categoryOverrides: {},
        },
      });
    }
    return apiOk({ preferences: serializePreferences(prefs) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") logger.error("notification-preferences.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("notification:preference.update", actor, {
      type: "notification_preference", id: null, ownerId: ctx.userId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const parsed = updateBody.safeParse(await req.json());
    if (!parsed.success) {
      return apiFail("VALIDATION_ERROR", "Invalid input.", parsed.error.flatten(), 422);
    }

    const updated = await updateNotificationPreferences({
      userId: ctx.userId,
      inAppEnabled: parsed.data.in_app_enabled,
      emailEnabled: parsed.data.email_enabled,
      smsEnabled: parsed.data.sms_enabled,
      muteSensitivePreviews: parsed.data.mute_sensitive_previews,
      categoryOverrides: parsed.data.category_overrides,
    });
    return apiOk({ preferences: serializePreferences(updated) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") logger.error("notification-preferences.put.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
