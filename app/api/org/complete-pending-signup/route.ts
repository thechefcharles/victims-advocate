/**
 * After email confirmation (no session during signup), create the org from user_metadata
 * pending_org_catalog_entry_id OR pending_org_name / pending_org_type.
 */

import { getAuthContext, requireAuth, requireActiveAccount } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createOrganizationForUser, ORG_TYPES } from "@/lib/server/org/createOrganizationForUser";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireActiveAccount(ctx, req);

    const supabase = getSupabaseAdmin();

    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(ctx.userId);
    if (userErr || !userData?.user) {
      return apiFailFromError(toAppError(new Error(userErr?.message ?? "User not found")));
    }

    const meta = userData.user.user_metadata ?? {};

    const rawCatalog = meta.pending_org_catalog_entry_id;
    let catalogEntryId: number | null = null;
    if (typeof rawCatalog === "number" && Number.isInteger(rawCatalog)) catalogEntryId = rawCatalog;
    else if (typeof rawCatalog === "string" && /^\d+$/.test(String(rawCatalog).trim()))
      catalogEntryId = parseInt(String(rawCatalog).trim(), 10);

    const name = typeof meta.pending_org_name === "string" ? meta.pending_org_name.trim() : "";
    const type = typeof meta.pending_org_type === "string" ? meta.pending_org_type.trim().toLowerCase() : "";

    const hasCatalog = catalogEntryId != null;
    const hasLegacy = name && ORG_TYPES.includes(type as (typeof ORG_TYPES)[number]);

    if (!hasCatalog && !hasLegacy) {
      return apiOk({ completed: false, reason: "no_pending_org" });
    }

    const result = await createOrganizationForUser({
      supabase,
      ctx,
      req,
      catalogEntryId: hasCatalog ? catalogEntryId : null,
      name: hasCatalog ? undefined : name,
      type: hasCatalog ? undefined : type,
      assignOwnerImmediately: ctx.isAdmin,
    });

    if ("error" in result) {
      if (result.error.code === "VALIDATION_ERROR") {
        return apiOk({ completed: false, reason: "already_has_org" });
      }
      return apiFailFromError(result.error);
    }

    if ("existingOrganization" in result) {
      return apiOk({
        completed: false,
        reason: "org_already_exists",
        organization_id: result.existingOrganization.id,
        organization_name: result.existingOrganization.name,
      });
    }

    const nextMeta = { ...meta } as Record<string, unknown>;
    delete nextMeta.pending_org_name;
    delete nextMeta.pending_org_type;
    delete nextMeta.pending_org_catalog_entry_id;

    const { error: updErr } = await supabase.auth.admin.updateUserById(ctx.userId, {
      user_metadata: nextMeta,
    });

    if (updErr) {
      logger.warn("org.complete_pending_signup.metadata_clear_failed", { message: updErr.message });
    }

    return apiOk({
      completed: true,
      organization: result.organization,
      claimPending: result.claimPending === true,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.complete_pending_signup.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
