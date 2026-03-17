/**
 * Phase 5: Clear login failure counters after successful sign-in. Call from client.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { recordLoginSuccess } from "@/lib/server/auth/rateLimit";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";

function parseInet(ip: string | null): string | null {
  if (!ip?.trim()) return null;
  const t = ip.trim();
  if (t.length > 45) return null;
  return t;
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    const email = ctx.user.email?.trim().toLowerCase() ?? null;
    const ip =
      parseInet(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null) ??
      parseInet(req.headers.get("x-real-ip")) ??
      null;

    await recordLoginSuccess({ email, ip });

    return apiOk({ cleared: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("auth.login-success.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
