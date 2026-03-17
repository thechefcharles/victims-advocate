/**
 * Phase 1: Client-triggered auth event logging.
 * Called after signup, login, logout, password reset.
 */

import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { logEvent } from "@/lib/server/audit/logEvent";
import { apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import type { AuditAction } from "@/lib/server/audit/logEvent";

const ALLOWED_ACTIONS: AuditAction[] = [
  "auth.signup",
  "auth.login",
  "auth.logout",
  "auth.password_reset_requested",
  "auth.password_reset_completed",
];

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    const body = (await req.json().catch(() => null)) as { action?: string; email?: string } | null;

    const action = body?.action;
    if (!action || !ALLOWED_ACTIONS.includes(action as AuditAction)) {
      return apiFail(
        "VALIDATION_ERROR",
        `action must be one of: ${ALLOWED_ACTIONS.join(", ")}`,
        undefined,
        400
      );
    }

    // auth.password_reset_requested can be unauthenticated
    const needsAuth = action !== "auth.password_reset_requested";
    if (needsAuth && !ctx) {
      return apiFail("AUTH_REQUIRED", "Unauthorized", undefined, 401);
    }

    await logEvent({
      ctx: ctx ?? null,
      action: action as AuditAction,
      resourceType: "user",
      resourceId: ctx?.userId ?? null,
      metadata: body?.email ? { email_hash: "[omitted]" } : { result: "success" },
      req,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("audit.log_auth_event.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
