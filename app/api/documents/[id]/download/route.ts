/**
 * Domain 1.4 — GET /api/documents/[id]/download
 *
 * Returns { data: { signedUrl, expiresAt }, error: null }.
 * NEVER returns storage_path. SOC 2 compliant download path.
 * Every download generates a separate audit event (document.download).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { downloadDocument } from "@/lib/server/documents/documentService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const actor = buildActor(ctx);

    const result = await downloadDocument(actor, id, supabase);
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("documents.download.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
