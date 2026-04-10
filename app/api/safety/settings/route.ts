import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError, apiFail } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { getSafetySettings, upsertSafetySettings } from "@/lib/server/safety/settings";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("safety_preference:view", actor, {
      type: "safety_preference",
      id: ctx.userId,
      ownerId: ctx.userId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const settings = await getSafetySettings({ ctx });
    return apiOk({ settings });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("safety.settings.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("safety_preference:update", actor, {
      type: "safety_preference",
      id: ctx.userId,
      ownerId: ctx.userId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const body = await req.json().catch(() => ({}));
    const patch = {
      safety_mode_enabled:
        typeof body?.safety_mode_enabled === "boolean" ? body.safety_mode_enabled : undefined,
      hide_sensitive_labels:
        typeof body?.hide_sensitive_labels === "boolean" ? body.hide_sensitive_labels : undefined,
      suppress_notification_previews:
        typeof body?.suppress_notification_previews === "boolean"
          ? body.suppress_notification_previews
          : undefined,
      clear_local_state_on_quick_exit:
        typeof body?.clear_local_state_on_quick_exit === "boolean"
          ? body.clear_local_state_on_quick_exit
          : undefined,
      reduced_dashboard_visibility:
        typeof body?.reduced_dashboard_visibility === "boolean"
          ? body.reduced_dashboard_visibility
          : undefined,
    } as Record<string, unknown>;

    const hasAny = Object.values(patch).some((v) => v !== undefined);
    if (!hasAny) {
      return apiFail("VALIDATION_ERROR", "No settings provided", undefined, 422);
    }

    const before = await getSafetySettings({ ctx });
    const settings = await upsertSafetySettings({
      ctx,
      patch: patch as any,
    });

    if (!before.safety_mode_enabled && settings.safety_mode_enabled) {
      await logEvent({ ctx, action: "safety_mode.enabled", resourceType: "user", resourceId: ctx.userId, req });
    } else if (before.safety_mode_enabled && !settings.safety_mode_enabled) {
      await logEvent({ ctx, action: "safety_mode.disabled", resourceType: "user", resourceId: ctx.userId, req });
    } else {
      await logEvent({ ctx, action: "safety_mode.updated", resourceType: "user", resourceId: ctx.userId, req });
    }

    return apiOk({ settings });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("safety.settings.post.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
