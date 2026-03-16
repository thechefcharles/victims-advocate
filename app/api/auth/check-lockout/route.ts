/**
 * Phase 5: Check if login is locked for this email (and optionally IP).
 * Client calls before attempting sign-in. Do not leak whether email exists.
 */

import { NextResponse } from "next/server";
import { checkLoginLockout } from "@/lib/server/auth/rateLimit";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";

function parseInet(ip: string | null): string | null {
  if (!ip?.trim()) return null;
  const t = ip.trim();
  if (t.length > 45) return null;
  return t;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.trim().toLowerCase() || null;

    const ip =
      parseInet(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null) ??
      parseInet(req.headers.get("x-real-ip")) ??
      null;

    const result = await checkLoginLockout({ email, ip });

    return apiOk({
      locked: result.locked,
      locked_until: result.lockedUntil,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("auth.check-lockout.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
