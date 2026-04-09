/**
 * Domain 3.1 — GET /api/applicant/profile
 * Returns the applicant's own profile (self view).
 * Thin route — all logic in applicantProfileService.
 */

import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getApplicantProfile } from "@/lib/server/applicant/applicantProfileService";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    const supabase = getSupabaseAdmin();
    const result = await getApplicantProfile(ctx, ctx.userId, supabase);
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("applicant.profile.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
