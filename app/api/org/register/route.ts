/**
 * Authenticated user creates an organization and becomes org_admin.
 * Requires catalog_entry_id (select from Illinois directory). One org per catalog entry.
 * If the catalog entry already has an org, returns ORG_ALREADY_EXISTS — use request-to-join flow.
 * For orgs not in the directory, use POST /api/org/pending-proposal.
 */

import { getAuthContext, requireAuth, requireActiveAccount } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createOrganizationForUser } from "@/lib/server/org/createOrganizationForUser";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    requireActiveAccount(ctx, req);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 422);
    }

    const rawCatalog = (body as { catalog_entry_id?: unknown }).catalog_entry_id;
    let catalogEntryId: number | null = null;
    if (typeof rawCatalog === "number" && Number.isInteger(rawCatalog)) catalogEntryId = rawCatalog;
    else if (typeof rawCatalog === "string" && /^\d+$/.test(rawCatalog.trim()))
      catalogEntryId = parseInt(rawCatalog.trim(), 10);

    if (catalogEntryId == null) {
      return apiFail(
        "VALIDATION_ERROR",
        "catalog_entry_id is required. Select your organization from the directory, or use the 'Add new organization' form if it's not listed.",
        undefined,
        422
      );
    }

    const result = await createOrganizationForUser({
      supabase: getSupabaseAdmin(),
      ctx,
      req,
      catalogEntryId,
    });

    if ("error" in result) {
      return apiFailFromError(result.error);
    }

    if ("existingOrganization" in result) {
      return apiFail(
        "ORG_ALREADY_EXISTS",
        "This organization already has a NxtStps account. Request to join instead.",
        {
          organization_id: result.existingOrganization.id,
          organization_name: result.existingOrganization.name,
        },
        409
      );
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
