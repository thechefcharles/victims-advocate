/**
 * Update Illinois victim assistance directory affiliation (profiles.affiliated_catalog_entry_id).
 * Victim / advocate / organization accounts may record which listed program they belong to.
 */

import { getAuthContext, requireAuth, requireActiveAccount } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getCatalogProgramById } from "@/lib/catalog/loadCatalog";
import { logger } from "@/lib/server/logging";

export async function PATCH(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireActiveAccount(ctx, req);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 422);
    }

    const raw = (body as { catalog_entry_id?: unknown }).catalog_entry_id;
    let catalogEntryId: number | null = null;
    if (raw === null || raw === "") {
      catalogEntryId = null;
    } else if (typeof raw === "number" && Number.isInteger(raw)) {
      catalogEntryId = raw;
    } else if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
      catalogEntryId = parseInt(raw.trim(), 10);
    } else {
      return apiFail("VALIDATION_ERROR", "catalog_entry_id must be a number or null", undefined, 422);
    }

    if (catalogEntryId != null && !getCatalogProgramById(catalogEntryId)) {
      return apiFail("VALIDATION_ERROR", "Unknown catalog_entry_id", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("profiles")
      .update({
        affiliated_catalog_entry_id: catalogEntryId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.userId);

    if (error) {
      logger.error("me.program_affiliation.update", { message: error.message });
      return apiFail("INTERNAL", "Could not update profile", undefined, 500);
    }

    return apiOk({ affiliatedCatalogEntryId: catalogEntryId });
  } catch (err) {
    const appErr = toAppError(err);
    return apiFailFromError(appErr);
  }
}
