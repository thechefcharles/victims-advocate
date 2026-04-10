/**
 * Domain 3.1 — GET/PATCH /api/applicant/preferences
 * Returns or updates the applicant's own preferences.
 * Thin route — all logic in applicantProfileService.
 */

import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getApplicantPreferencesForSelf,
  updateApplicantPreferences,
} from "@/lib/server/applicant/applicantProfileService";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    const supabase = getSupabaseAdmin();
    const prefs = await getApplicantPreferencesForSelf(ctx, supabase);
    return apiOk({ preferences: prefs });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("applicant.preferences.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const updated = await updateApplicantPreferences(ctx, body as any, supabase);
    return apiOk({ preferences: updated });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("applicant.preferences.patch.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
