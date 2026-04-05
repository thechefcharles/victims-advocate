/**
 * Creates an organization from an Illinois directory entry.
 * Platform admins become org_owner immediately; organization leaders get a pending org_claim_requests row
 * until an administrator approves ownership.
 * Requires catalog_entry_id. One org per catalog entry.
 * If the catalog entry already has an org, returns ORG_ALREADY_EXISTS — use POST /api/org/claim-request
 * (no owners yet) or POST /api/org/request-to-join.
 * For orgs not in the directory, use POST /api/org/pending-proposal.
 *
 * Authorization: profile role organization or platform admin only (victim/advocate denied).
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

    if (!ctx.isAdmin && ctx.realRole !== "organization") {
      return apiFail(
        "FORBIDDEN",
        "Only organization representatives or administrators can register an organization from the Illinois directory. Victim and advocate accounts cannot use this action.",
        undefined,
        403
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
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
      assignOwnerImmediately: ctx.isAdmin,
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

    const claimPending = result.claimPending === true;
    return apiOk(
      {
        organization: result.organization,
        claimPending,
        message: claimPending
          ? "Your ownership request was submitted. A platform administrator will review it."
          : "Organization created. You are the org admin.",
      },
      undefined,
      201
    );
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("org.register.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
