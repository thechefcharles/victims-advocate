/**
 * Phase 6: Remove document restriction.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { setDocumentRestriction, appendCaseTimelineEvent } from "@/lib/server/data";
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

    const doc = await setDocumentRestriction({
      documentId: documentId.trim(),
      restricted: false,
      ctx,
    });

    if (doc.case_id && doc.organization_id) {
      appendCaseTimelineEvent({
        caseId: doc.case_id,
        organizationId: doc.organization_id,
        actor: { userId: ctx.userId, role: ctx.orgRole ?? ctx.role },
        eventType: "case.document_unrestricted",
        title: "Document unrestricted",
        description: doc.file_name ? `File: ${doc.file_name}` : null,
        metadata: { document_id: doc.id },
      }).catch(() => {});
    }

    await logEvent({
      ctx,
      action: "document.unrestricted",
      resourceType: "document",
      resourceId: doc.id,
      metadata: { document_id: doc.id, case_id: doc.case_id ?? undefined },
      req,
    });

    return apiOk({ unrestricted: true, document_id: doc.id });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("documents.unrestrict.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
