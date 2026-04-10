/**
 * Domain 3.1 — DELETE /api/applicant/bookmarks/[id]
 * Deletes a specific bookmark owned by the authenticated applicant.
 * Thin route — all logic in applicantBookmarkService.
 */

import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { removeBookmark } from "@/lib/server/applicant/applicantBookmarkService";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    const { id } = await params;
    const supabase = getSupabaseAdmin();
    await removeBookmark(ctx, id, supabase);
    return new Response(null, { status: 204 });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("applicant.bookmarks.delete.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
