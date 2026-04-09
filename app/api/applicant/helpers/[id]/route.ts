/**
 * Domain 3.1 — DELETE /api/applicant/helpers/[id]
 * Revokes a trusted helper grant by grant ID.
 * Thin route — all logic in trustedHelperService.
 */

import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { revokeHelper } from "@/lib/server/applicant/trustedHelperService";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    const { id } = await params;
    const supabase = getSupabaseAdmin();
    await revokeHelper(ctx, id, supabase);
    return new Response(null, { status: 204 });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("applicant.helpers.delete.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
