/**
 * Phase 5: Record a failed login attempt. Call from client after signInWithPassword fails.
 */

import { NextResponse } from "next/server";
import { recordLoginFailure } from "@/lib/server/auth/rateLimit";
import { logEvent } from "@/lib/server/audit/logEvent";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";

function parseInet(ip: string | null): string | null {
  if (!ip?.trim()) return null;
  const t = ip.trim();
  if (t.length > 45) return null;
  return t;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = body?.email != null ? String(body.email).trim().toLowerCase() : null;

    const ip =
      parseInet(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null) ??
      parseInet(req.headers.get("x-real-ip")) ??
      null;

    const result = await recordLoginFailure({ email, ip });

    await logEvent({
      ctx: null,
      action: result.locked ? "auth.locked" : "auth.login_failed",
      metadata: { email: email ?? undefined, locked: result.locked },
      req,
    });

    return apiOk({
      locked: result.locked,
      locked_until: result.lockedUntil,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("auth.login-failed.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
