/**
 * Domain 1.4 — GET /api/documents/[id]
 * Returns { data: DocumentView, error: null }. Never returns storage_path.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { getDocument } from "@/lib/server/documents/documentService";

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

    const doc = await getDocument(actor, id, supabase);
    return apiOk(doc);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("documents.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
