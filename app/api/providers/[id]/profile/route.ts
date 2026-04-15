/**
 * GET /api/providers/[id]/profile — PUBLIC provider profile.
 *
 * Includes qualityTier (label only — never overall_score) and active programs.
 * No auth required.
 */

import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getPublicProviderProfile } from "@/lib/server/orgPrograms/publicProviderProfile";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    if (!id) return apiFail("VALIDATION_ERROR", "Missing provider id.");
    const profile = await getPublicProviderProfile(id);
    return apiOk(profile);
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("providers.profile.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
