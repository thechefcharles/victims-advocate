/**
 * Phase 5: Admin disable user – set account_status = disabled, disabled_at = now().
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const body = await req.json().catch(() => null);
    const userId = body?.user_id ?? body?.userId;
    if (typeof userId !== "string" || !userId.trim()) {
      return apiFail("VALIDATION_ERROR", "user_id is required", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        account_status: "disabled",
        disabled_at: new Date().toISOString(),
      })
      .eq("id", userId.trim())
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    if (!data) {
      return apiFail("NOT_FOUND", "User not found", undefined, 404);
    }

    await logEvent({
      ctx,
      action: "auth.account_disabled",
      resourceType: "user",
      resourceId: data.id,
      metadata: { target_user_id: data.id },
      req,
    });

    return apiOk({ disabled: true, user_id: data.id });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.users.disable.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
