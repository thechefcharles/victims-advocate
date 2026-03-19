/**
 * Authenticated user creates an organization and becomes org_admin.
 * One org per user (unique user_id on org_memberships).
 *
 * Email verification is not required so organization signup can complete immediately after signUp()
 * when a session is returned (prototype / faster onboarding).
 */

import { getAuthContext, requireAuth, requireActiveAccount } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createOrganizationForUser, ORG_TYPES } from "@/lib/server/org/createOrganizationForUser";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireActiveAccount(ctx, req);

    const supabase = getSupabaseAdmin();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 422);
    }

    const rawCatalog = (body as { catalog_entry_id?: unknown }).catalog_entry_id;
    let catalogEntryId: number | null = null;
    if (typeof rawCatalog === "number" && Number.isInteger(rawCatalog)) catalogEntryId = rawCatalog;
    else if (typeof rawCatalog === "string" && /^\d+$/.test(rawCatalog.trim()))
      catalogEntryId = parseInt(rawCatalog.trim(), 10);

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim().toLowerCase() : "";

    if (catalogEntryId == null) {
      if (!name) {
        return apiFail("VALIDATION_ERROR", "name or catalog_entry_id is required", undefined, 422);
      }
      if (!ORG_TYPES.includes(type as (typeof ORG_TYPES)[number])) {
        return apiFail(
          "VALIDATION_ERROR",
          `type must be one of: ${ORG_TYPES.join(", ")}`,
          undefined,
          422
        );
      }
    }

    const result = await createOrganizationForUser({
      supabase,
      ctx,
      req,
      catalogEntryId,
      name: name || undefined,
      type: type || undefined,
    });

    if ("error" in result) {
      return apiFailFromError(result.error);
    }

    return apiOk(
      { organization: result.organization, message: "Organization created. You are the org admin." },
      undefined,
      201
    );
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.register.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
