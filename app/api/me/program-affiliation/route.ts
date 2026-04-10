/**
 * Domain 3.3 — User: set program affiliation (profiles.affiliated_catalog_entry_id).
 * Auth via can("profile:set_affiliation"). Logic delegated to programService.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { setUserProgramAffiliation, CatalogEntryNotFoundError } from "@/lib/server/programs";

export async function PATCH(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const profileResource = { type: "applicant_profile" as const, id: ctx.userId, ownerId: ctx.userId };
    const decision = await can("profile:set_affiliation", actor, profileResource);
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Authentication required.", undefined, 403);

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

    await setUserProgramAffiliation(ctx.userId, catalogEntryId, ctx);

    logger.info("me.program_affiliation.updated", { userId: ctx.userId, catalogEntryId });
    return apiOk({ affiliated_catalog_entry_id: catalogEntryId });
  } catch (err) {
    if (err instanceof CatalogEntryNotFoundError) {
      return apiFail("VALIDATION_ERROR", "Unknown catalog_entry_id.", undefined, 422);
    }
    const appErr = toAppError(err);
    logger.error("me.program_affiliation.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
