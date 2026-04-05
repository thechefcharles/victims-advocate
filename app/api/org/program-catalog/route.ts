/**
 * Org admins: update which Illinois Crime Victim Assistance directory row this org represents.
 * Updates name, type, metadata, and catalog_entry_id to stay in sync with the directory.
 */

import { getAuthContext, requireAuth, requireActiveAccount, isOrgManagement } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getCatalogProgramById } from "@/lib/catalog/loadCatalog";
import { orgRowFromCatalogEntry } from "@/lib/server/org/catalogOrgFields";
import { logger } from "@/lib/server/logging";

export async function PATCH(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireActiveAccount(ctx, req);

    if (!ctx.orgId || !isOrgManagement(ctx.orgRole)) {
      return apiFail("FORBIDDEN", "Only an organization admin can update the agency directory link.", undefined, 403);
    }

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

    const { data: orgRow, error: orgFetchErr } = await supabase
      .from("organizations")
      .select("id, metadata")
      .eq("id", ctx.orgId)
      .maybeSingle();

    if (orgFetchErr || !orgRow) {
      logger.error("org.program_catalog.fetch", { message: orgFetchErr?.message });
      return apiFail("INTERNAL", "Could not load organization", undefined, 500);
    }

    const existingMeta =
      orgRow.metadata && typeof orgRow.metadata === "object" && !Array.isArray(orgRow.metadata)
        ? { ...(orgRow.metadata as Record<string, unknown>) }
        : {};

    let patch: Record<string, unknown>;

    if (catalogEntryId != null) {
      const row = orgRowFromCatalogEntry(catalogEntryId);
      if (!row) {
        return apiFail("VALIDATION_ERROR", "Unknown catalog_entry_id", undefined, 422);
      }
      const { data: existingOrg } = await supabase
        .from("organizations")
        .select("id")
        .eq("catalog_entry_id", catalogEntryId)
        .neq("id", ctx.orgId)
        .maybeSingle();
      if (existingOrg) {
        return apiFail(
          "VALIDATION_ERROR",
          "This directory program is already linked to another organization.",
          undefined,
          409
        );
      }
      patch = {
        name: row.name,
        type: row.type,
        catalog_entry_id: row.catalog_entry_id,
        metadata: row.metadata,
      };
    } else {
      delete existingMeta.catalog_program;
      patch = {
        catalog_entry_id: null,
        metadata: existingMeta,
      };
    }

    const { error: updErr } = await supabase.from("organizations").update(patch).eq("id", ctx.orgId);

    if (updErr) {
      logger.error("org.program_catalog.update", { message: updErr.message });
      return apiFail("INTERNAL", "Could not update organization", undefined, 500);
    }

    return apiOk({ organizationCatalogEntryId: catalogEntryId });
  } catch (err) {
    const appErr = toAppError(err);
    return apiFailFromError(appErr);
  }
}
