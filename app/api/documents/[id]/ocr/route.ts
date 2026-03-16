/**
 * Phase 13: Run OCR on a document (POST) or get latest OCR status and fields (GET).
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getCaseById } from "@/lib/server/data";
import { assertDocumentAccess } from "@/lib/server/data/documents";
import { appendCaseTimelineEvent } from "@/lib/server/data";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { runOcrForDocument, getLatestOcrForDocument } from "@/lib/server/ocr";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET: latest OCR run and extracted fields for this document. */
export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id: documentId } = await context.params;

    if (!documentId) {
      return apiFail("VALIDATION_ERROR", "Document id required", undefined, 400);
    }

    const result = await getLatestOcrForDocument({ documentId, ctx });
    if (!result) {
      return apiOk({ ocr: null, run: null, fields: [] });
    }

    return apiOk({
      ocr: result.run,
      run: result.run,
      fields: result.fields,
      inconsistencies: result.run.result_summary?.inconsistencies ?? [],
      warnings: result.run.result_summary?.warnings ?? [],
      type_mismatch: result.run.result_summary?.type_mismatch ?? false,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("documents.ocr.get.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

/** POST: run OCR on document. Advocate/admin only. Appends case.ocr_processed on success. */
export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id: documentId } = await context.params;

    if (!documentId) {
      return apiFail("VALIDATION_ERROR", "Document id required", undefined, 400);
    }

    const doc = await assertDocumentAccess({ documentId, ctx, accessType: "view" });
    const caseId = doc.case_id;
    if (!caseId) {
      return apiFail("FORBIDDEN", "Document must be attached to a case", undefined, 403);
    }

    const caseResult = await getCaseById({ caseId, ctx });
    if (!caseResult?.access.can_edit && caseResult?.access.role !== "owner") {
      return apiFail("FORBIDDEN", "Only advocates or admins can run OCR", undefined, 403);
    }
    if (caseResult.access.role === "owner") {
      return apiFail("FORBIDDEN", "Only advocates or admins can run OCR", undefined, 403);
    }

    const body = await req.json().catch(() => ({}));
    const forceRerun = Boolean(body?.forceRerun);

    await logEvent({
      ctx,
      action: "ocr.run_started",
      resourceType: "document",
      resourceId: documentId,
      metadata: { document_id: documentId, case_id: caseId },
      req,
    }).catch(() => {});

    let runResult;
    try {
      runResult = await runOcrForDocument({ documentId, ctx, forceRerun });
    } catch (err) {
      await logEvent({
        ctx,
        action: "ocr.run_failed",
        resourceType: "document",
        resourceId: documentId,
        metadata: { document_id: documentId, error: String(err) },
        req,
      }).catch(() => {});
      throw err;
    }

    await logEvent({
      ctx,
      action: "ocr.run_completed",
      resourceType: "document",
      resourceId: documentId,
      metadata: { document_id: documentId, run_id: runResult.runId, field_count: runResult.fieldCount },
      req,
    }).catch(() => {});

    await appendCaseTimelineEvent({
      caseId,
      organizationId: doc.organization_id,
      actor: { userId: ctx.userId, role: caseResult.access.role },
      eventType: "case.ocr_processed",
      title: "Document processed with OCR",
      description: `${runResult.fieldCount} field(s) extracted.`,
      metadata: { document_id: documentId, run_id: runResult.runId },
    });

    logger.info("documents.ocr.run", {
      documentId,
      runId: runResult.runId,
      userId: ctx.userId,
      fieldCount: runResult.fieldCount,
    });

    const latest = await getLatestOcrForDocument({ documentId, ctx });
    return apiOk({
      runId: runResult.runId,
      status: runResult.status,
      resultSummary: runResult.resultSummary,
      fieldCount: runResult.fieldCount,
      run: latest?.run ?? null,
      fields: latest?.fields ?? [],
      inconsistencies: runResult.resultSummary.inconsistencies ?? [],
      warnings: runResult.resultSummary.warnings ?? [],
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("documents.ocr.post.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
