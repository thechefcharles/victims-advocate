/**
 * Whether an Illinois directory catalog row already has an active NxtStps organization.
 * Used by onboarding to show Request To Join without attempting register first.
 */

import { getAuthContext, requireAuth, requireActiveAccount } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getCatalogProgramById } from "@/lib/catalog/loadCatalog";
import { logger } from "@/lib/server/logging";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireActiveAccount(ctx, req);

    if (!ctx.isAdmin && ctx.realRole !== "organization") {
      return apiFail("FORBIDDEN", "This directory check is only available to organization leaders.", undefined, 403);
    }

    const url = new URL(req.url);
    const raw = url.searchParams.get("catalog_entry_id");
    let catalogEntryId: number | null = null;
    if (raw && /^\d+$/.test(raw.trim())) catalogEntryId = parseInt(raw.trim(), 10);

    if (catalogEntryId == null) {
      return apiFail("VALIDATION_ERROR", "catalog_entry_id is required", undefined, 422);
    }

    if (!getCatalogProgramById(catalogEntryId)) {
      return apiFail("VALIDATION_ERROR", "Unknown catalog_entry_id", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const { data: org, error } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("catalog_entry_id", catalogEntryId)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (org) {
      const { count, error: cntErr } = await supabase
        .from("org_memberships")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org.id)
        .eq("status", "active")
        .eq("org_role", "org_owner");

      if (cntErr) throw new Error(cntErr.message);

      return apiOk({
        catalog_entry_id: catalogEntryId,
        has_workspace: true,
        organization_id: org.id,
        organization_name: org.name ?? "Organization",
        org_owner_count: count ?? 0,
      });
    }

    return apiOk({
      catalog_entry_id: catalogEntryId,
      has_workspace: false,
      organization_id: null,
      organization_name: null,
      org_owner_count: null,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.directory_entry_status.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
