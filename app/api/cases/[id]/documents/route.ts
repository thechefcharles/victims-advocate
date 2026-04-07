/**
 * Domain 1.4 — GET /api/cases/[id]/documents
 * List all documents for a case. Returns { data: DocumentView[], error: null }.
 * storage_path is never present in any row.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
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

    const { id: caseId } = await context.params;
    const supabase = getSupabaseAdmin();
    const actor = buildActor(ctx);

    const docs = await listWorkflowDocuments(actor, "case", caseId, supabase);
    return NextResponse.json({ data: docs, error: null });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("cases.documents.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
