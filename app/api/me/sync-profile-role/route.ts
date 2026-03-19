/**
 * Sync profiles.role from auth user_metadata.role (victim | advocate | organization).
 * Call after signup/login if the DB trigger is missing or out of date.
 */

import { getAuthContext, requireAuth, requireActiveAccount } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getCatalogProgramById } from "@/lib/catalog/loadCatalog";

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

    const meta = userData.user.user_metadata ?? {};
    const metaRole = (meta.role as string | undefined)?.toLowerCase();
    if (!metaRole || !ALLOWED.has(metaRole)) {
      return apiOk({ synced: false, reason: "no_valid_metadata_role" });
    }

    const rawAff = meta.affiliated_catalog_entry_id;
    let affiliated: number | null = null;
    if (typeof rawAff === "number" && Number.isInteger(rawAff) && getCatalogProgramById(rawAff)) {
      affiliated = rawAff;
    } else if (typeof rawAff === "string" && /^\d+$/.test(rawAff.trim())) {
      const n = parseInt(rawAff.trim(), 10);
      if (getCatalogProgramById(n)) affiliated = n;
    }

    const row: Record<string, unknown> = {
      id: ctx.userId,
      role: metaRole,
      updated_at: new Date().toISOString(),
    };
    if (affiliated != null) row.affiliated_catalog_entry_id = affiliated;

    const { error: upErr } = await supabase.from("profiles").upsert(row, { onConflict: "id" });

    if (upErr) {
      logger.warn("me.sync_profile_role.upsert_failed", { message: upErr.message });
      return apiOk({ synced: false, error: upErr.message });
    }

    return apiOk({ synced: true, role: metaRole, affiliatedCatalogEntryId: affiliated });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("me.sync_profile_role.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
