/**
 * Domain 1.4 — POST /api/documents
 * Upload a new document. Returns { data: DocumentApplicantView, error: null }.
 * storage_path is never returned to the client.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { uploadDocument } from "@/lib/server/documents/documentService";
import { validateUpload } from "@/lib/server/documents/uploadValidation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const validation = validateUpload(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] ?? "File validation failed", errors: validation.errors },
        { status: 422 },
      );
    }

    const docType = String(formData.get("doc_type") ?? formData.get("docType") ?? "other");
    const description = String(formData.get("description") ?? "");
    const linkedObjectType = formData.get("linked_object_type")?.toString() ?? undefined;
    const linkedObjectId = formData.get("linked_object_id")?.toString() ?? undefined;

    const supabase = getSupabaseAdmin();
    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".") + 1) : "bin";
    const storagePath = `${ctx.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("case-documents")
      .upload(storagePath, file, { cacheControl: "3600", upsert: false, contentType: file.type || "application/octet-stream" });

    if (uploadError) {
      logger.error("documents.post.storage_error", { error: uploadError.message });
      return NextResponse.json({ error: "File upload failed" }, { status: 500 });
    }

    const actor = buildActor(ctx);
    const doc = await uploadDocument(
      actor,
      {
        doc_type: docType,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
        storage_path: storagePath,
        organization_id: ctx.orgId ?? null,
        linked_object_type: linkedObjectType,
        linked_object_id: linkedObjectId,
      },
      supabase,
    );

    return NextResponse.json({ data: doc, error: null });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("documents.post.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
