/**
 * Phase 5: Resend email verification. Allowed for authenticated but unverified users.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    if (ctx.emailVerified) {
      return apiOk({ message: "Email already verified" });
    }

    const email = ctx.user.email;
    if (!email) {
      return apiOk({ message: "No email to verify" });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      logger.warn("auth.resend_verification.failed", { error: error.message });
      throw new Error(error.message);
    }

    await logEvent({
      ctx,
      action: "auth.email_verification_resent",
      metadata: { email },
      req,
    });

    return apiOk({ sent: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("auth.resend-verification.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
