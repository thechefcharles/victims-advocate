/**
 * Phase 6: Soft delete document.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { softDeleteDocument } from "@/lib/server/data/documents";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => null);
    const documentId = body?.document_id ?? body?.documentId;
    if (typeof documentId !== "string" || !documentId.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "document_id is required" } },
        { status: 422 }
      );
    }

    const doc = await softDeleteDocument({ documentId: documentId.trim(), ctx });

    await logEvent({
      ctx,
      action: "document.deleted",
      resourceType: "document",
      resourceId: doc.id,
      metadata: { document_id: doc.id, case_id: doc.case_id ?? undefined },
      req,
    });

    return apiOk({ deleted: true, document_id: doc.id });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("documents.delete.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
