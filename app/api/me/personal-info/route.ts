/**
 * PATCH: victim updates profiles.personal_info (partial merge).
 */

import { getAuthContext, requireAuth, requireRole } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import {
  mergePersonalInfo,
  personalInfoPatchSchema,
} from "@/lib/personalInfo";

export async function PATCH(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireRole(ctx, "victim");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
    }

    const parsed = personalInfoPatchSchema.safeParse(body);
    if (!parsed.success) {
      return apiFail("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; ") || "Some fields need another look. Check the form and try again.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const { data: row, error: fetchErr } = await supabase
      .from("profiles")
      .select("personal_info")
      .eq("id", ctx.userId)
      .maybeSingle();

    if (fetchErr) {
      throw new Error(fetchErr.message);
    }

    const merged = mergePersonalInfo(row?.personal_info ?? {}, parsed.data);

    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        personal_info: merged,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.userId);

    if (upErr) {
      throw new Error(upErr.message);
    }

    logger.info("me.personal_info.updated", { userId: ctx.userId });
    return apiOk({ personalInfo: merged });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("me.personal_info.patch.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
