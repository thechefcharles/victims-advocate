/**
 * Domain 3.1 — GET/POST /api/applicant/helpers
 * List or grant trusted helper access for the authenticated applicant.
 * Thin route — all logic in trustedHelperService.
 */

import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { listMyHelpers, grantHelper } from "@/lib/server/applicant/trustedHelperService";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    const supabase = getSupabaseAdmin();
    const helpers = await listMyHelpers(ctx, supabase);
    return apiOk({ helpers });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("applicant.helpers.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request.", undefined, 422);
    }

    const { helperUserId, scope, notes } = body as Record<string, unknown>;

    if (!helperUserId || typeof helperUserId !== "string") {
      return apiFail("VALIDATION_ERROR", "helperUserId is required.", undefined, 422);
    }
    if (!Array.isArray(scope)) {
      return apiFail("VALIDATION_ERROR", "scope must be an array of action strings.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const grant = await grantHelper(
      ctx,
      helperUserId,
      scope as string[],
      typeof notes === "string" ? notes : null,
      supabase,
    );
    return apiOk({ grant }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("applicant.helpers.post.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
