/**
 * Phase 6: Secure document access – returns short-lived signed URL after auth + org + case + document checks.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { assertDocumentAccess } from "@/lib/server/data/documents";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";

const BUCKET = "case-documents";
const EXPIRY_VIEW_SEC = 300;
const EXPIRY_DOWNLOAD_SEC = 300;

export async function POST(req: Request) {
  let documentIdForLog: string | null = null;
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => null);
    const documentIdRaw = body?.document_id ?? body?.documentId;
    const accessType = (body?.access_type ?? "view") === "download" ? "download" : "view";

    if (typeof documentIdRaw !== "string" || !documentIdRaw.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "document_id is required" } },
        { status: 422 }
      );
    }
    const documentId = documentIdRaw.trim();
    documentIdForLog = documentId;

    logEvent({
      ctx,
      action: "document.access_requested",
      resourceType: "document",
      resourceId: documentId,
      metadata: { document_id: documentId, access_type: accessType },
      req,
    }).catch(() => {});

    const doc = await assertDocumentAccess({
      documentId,
      ctx,
      accessType,
      req,
    });

    const path = doc.storage_path;
    if (!path) {
      logger.warn("documents.access_url.no_storage_path", { documentId: doc.id });
      return NextResponse.json(
        { ok: false, error: { code: "INTERNAL", message: "Document has no storage path" } },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();
    const expiry = accessType === "download" ? EXPIRY_DOWNLOAD_SEC : EXPIRY_VIEW_SEC;
    const { data: signed, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiry);

    if (error) {
      logger.error("documents.access_url.signed_failed", { documentId: doc.id, error: error.message });
      return NextResponse.json(
        { ok: false, error: { code: "INTERNAL", message: "Failed to create access URL" } },
        { status: 500 }
      );
    }

    logEvent({
      ctx,
      action: "document.access_granted",
      resourceType: "document",
      resourceId: doc.id,
      metadata: {
        document_id: doc.id,
        case_id: doc.case_id ?? undefined,
        access_type: accessType,
      },
      req,
    }).catch(() => {});

    return apiOk({
      url: signed.signedUrl,
      expires_at: new Date(Date.now() + expiry * 1000).toISOString(),
      access_type: accessType,
    });
  } catch (err) {
    const appErr = toAppError(err);
    if (
      appErr.code === "DOCUMENT_ACCESS_DENIED" ||
      appErr.code === "DOCUMENT_RESTRICTED" ||
      appErr.code === "DOCUMENT_DELETED" ||
      appErr.code === "NOT_FOUND"
    ) {
      logEvent({
        ctx: null,
        action: "document.access_denied",
        metadata: { code: appErr.code, document_id: documentIdForLog ?? undefined },
        req,
      }).catch(() => {});
    }
    logger.error("documents.access_url.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
