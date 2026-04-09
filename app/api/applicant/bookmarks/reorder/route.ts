/**
 * Domain 3.1 — POST /api/applicant/bookmarks/reorder
 * Reorders the authenticated applicant's bookmarks.
 * Thin route — all logic in applicantBookmarkService.
 */

import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { reorderBookmarks } from "@/lib/server/applicant/applicantBookmarkService";

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

    const { orderedIds } = body as Record<string, unknown>;

    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
      return apiFail("VALIDATION_ERROR", "orderedIds must be an array of strings.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    await reorderBookmarks(ctx, orderedIds as string[], supabase);
    return apiOk({ reordered: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("applicant.bookmarks.reorder.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
