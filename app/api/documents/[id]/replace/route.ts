/**
 * Domain 1.4 — POST /api/documents/[id]/replace
 * Replace a document with a new file (preserves document id, archives old version).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { replaceDocument } from "@/lib/server/documents/documentService";
import { validateUpload } from "@/lib/server/documents/uploadValidation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const runtime = "nodejs";

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return apiFail("VALIDATION_ERROR", "File is required");
    }

    const validation = validateUpload(file);
    if (!validation.valid) {
      return apiFail(
        "VALIDATION_ERROR",
        validation.errors[0] ?? "File validation failed",
        { errors: validation.errors },
      );
    }

    const supabase = getSupabaseAdmin();
    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".") + 1) : "bin";
    const storagePath = `${ctx.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("case-documents")
      .upload(storagePath, file, { cacheControl: "3600", upsert: false, contentType: file.type || "application/octet-stream" });

    if (uploadError) {
      return apiFail("INTERNAL", "File upload failed");
    }

    const actor = buildActor(ctx);
    const doc = await replaceDocument(
      actor,
      id,
      { file_name: file.name, file_size: file.size, mime_type: file.type || null, storage_path: storagePath },
      supabase,
    );

    return apiOk(doc);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("documents.replace.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
