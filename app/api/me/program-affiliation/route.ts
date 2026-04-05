/**
 * Update Illinois victim assistance directory affiliation (profiles.affiliated_catalog_entry_id).
 * Victim / advocate / organization accounts may record which listed program they belong to.
 */

import { getAuthContext, requireAuth, requireActiveAccount } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getCatalogProgramById } from "@/lib/catalog/loadCatalog";
import { logger } from "@/lib/server/logging";

function profileAffiliationFail(err: { message: string; code?: string }) {
  const msg = err.message ?? "";
  if (msg.includes("affiliated_catalog_entry_id")) {
    return apiFail(
      "INTERNAL",
      "Database is missing the affiliation column. In Supabase, run migration 20260323000000_profiles_program_catalog.sql (adds profiles.affiliated_catalog_entry_id).",
      { code: err.code, hint: msg },
      500
    );
  }
  return apiFail("INTERNAL", `Could not update profile: ${msg}`, { code: err.code }, 500);
}

export async function PATCH(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireActiveAccount(ctx, req);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
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
    const payload = {
      affiliated_catalog_entry_id: catalogEntryId,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedRows, error: updateErr } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", ctx.userId)
      .select("id");

    if (updateErr) {
      logger.error("me.program_affiliation.update", { message: updateErr.message, code: updateErr.code });
      return profileAffiliationFail(updateErr);
    }

    const touched = updatedRows && updatedRows.length > 0;
    if (!touched) {
      const role = ctx.realRole ?? ctx.role;
      const { error: upsertErr } = await supabase.from("profiles").upsert(
        {
          id: ctx.userId,
          role,
          ...payload,
        },
        { onConflict: "id" }
      );

      if (upsertErr) {
        logger.error("me.program_affiliation.upsert", { message: upsertErr.message, code: upsertErr.code });
        return profileAffiliationFail(upsertErr);
      }
    }

    return apiOk({ affiliatedCatalogEntryId: catalogEntryId });
  } catch (err) {
    const appErr = toAppError(err);
    return apiFailFromError(appErr);
  }
}
