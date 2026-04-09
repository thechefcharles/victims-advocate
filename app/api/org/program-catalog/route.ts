/**
 * Domain 3.3 — Org: link to IL directory catalog entry.
 * Auth via can("org:link_catalog_entry"). Logic delegated to programService.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { linkOrgCatalogEntry, CatalogEntryNotFoundError, CatalogEntryDuplicateError } from "@/lib/server/programs";

export async function PATCH(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    if (!ctx.orgId) {
      return apiFail("FORBIDDEN", "Organization membership required.", undefined, 403);
    }

    const actor = buildActor(ctx);
    const orgResource = { type: "org" as const, id: ctx.orgId, ownerId: ctx.orgId };
    const decision = await can("org:link_catalog_entry", actor, orgResource);
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Organization owner or supervisor required.", undefined, 403);

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
      return apiFail("VALIDATION_ERROR", "catalog_entry_id must be a number or null.", undefined, 422);
    }

    await linkOrgCatalogEntry(ctx.orgId, catalogEntryId, ctx);

    logger.info("org.program_catalog.linked", { orgId: ctx.orgId, catalogEntryId, userId: ctx.userId });
    return apiOk({ organizationCatalogEntryId: catalogEntryId });
  } catch (err) {
    if (err instanceof CatalogEntryNotFoundError) {
      return apiFail("VALIDATION_ERROR", "Unknown catalog_entry_id.", undefined, 422);
    }
    if (err instanceof CatalogEntryDuplicateError) {
      return apiFail("CONFLICT", "This directory program is already linked to another organization.", undefined, 409);
    }
    const appErr = toAppError(err);
    logger.error("org.program_catalog.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
