/**
 * Sync profiles.role from auth user_metadata.role (victim | advocate | organization).
 * Call after signup/login if the DB trigger is missing or out of date.
 */

import { getAuthContext, requireAuth, requireActiveAccount } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";

const ALLOWED = new Set(["victim", "advocate", "organization"]);

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireActiveAccount(ctx, req);

    const supabase = getSupabaseAdmin();
    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(ctx.userId);
    if (userErr || !userData?.user) {
      return apiFailFromError(
        toAppError(new Error(userErr?.message ?? "User not found"))
      );
    }

    const metaRole = (userData.user.user_metadata?.role as string | undefined)?.toLowerCase();
    if (!metaRole || !ALLOWED.has(metaRole)) {
      return apiOk({ synced: false, reason: "no_valid_metadata_role" });
    }

    const { error: upErr } = await supabase.from("profiles").upsert(
      {
        id: ctx.userId,
        role: metaRole,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (upErr) {
      logger.warn("me.sync_profile_role.upsert_failed", { message: upErr.message });
      return apiOk({ synced: false, error: upErr.message });
    }

    return apiOk({ synced: true, role: metaRole });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("me.sync_profile_role.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
