/**
 * Domain 1.4 — GET /api/support-requests/[id]/documents
 * List all documents for a support request. Returns { data: DocumentView[], error: null }.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { listWorkflowDocuments } from "@/lib/server/documents/documentService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id: supportRequestId } = await context.params;
    const supabase = getSupabaseAdmin();
    const actor = buildActor(ctx);

    const docs = await listWorkflowDocuments(actor, "support_request", supportRequestId, supabase);
    return apiOk(docs);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("support-requests.documents.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
