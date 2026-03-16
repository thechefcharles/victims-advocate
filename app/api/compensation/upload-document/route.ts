import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { validateUpload } from "@/lib/server/documents/uploadValidation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return apiFail("VALIDATION_ERROR", "File is required", undefined, 400);
    }

    const validation = validateUpload(file);
    if (!validation.valid) {
      logEvent({
        ctx,
        action: "document.upload_rejected",
        metadata: { errors: validation.errors, file_name: file.name, file_size: file.size },
        req,
      }).catch(() => {});
      return apiFail(
        "DOCUMENT_UPLOAD_INVALID",
        validation.errors[0] ?? "Invalid file",
        { errors: validation.errors },
        422
      );
    }

    const docType = String(formData.get("docType") || "other");
    const description =
      typeof formData.get("description") === "string"
        ? (formData.get("description") as string)
        : null;

    const ext = file.name.includes(".")
      ? file.name.substring(file.name.lastIndexOf(".") + 1)
      : "bin";

    const supabaseAdmin = getSupabaseAdmin();
    const storagePath = `${ctx.userId}/unassigned/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("case-documents")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      logger.error("compensation.upload_document.storage_failed", {
        userId: ctx.userId,
        error: uploadError.message,
      });
      return apiFail("INTERNAL", "Failed to upload file", undefined, 500);
    }

    let orgId: string | null = ctx.orgId ?? null;
    if (!orgId) {
      const { data: legacyOrg } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("name", "Legacy (pre-tenant)")
        .limit(1)
        .maybeSingle();
      orgId = legacyOrg?.id ?? null;
    }
    if (!orgId) {
      return apiFail(
        "FORBIDDEN",
        "Organization membership or legacy org required to upload documents",
        undefined,
        403
      );
    }

    const { data, error: insertError } = await supabaseAdmin
      .from("documents")
      .insert({
        case_id: null,
        organization_id: orgId,
        uploaded_by_user_id: ctx.userId,
        doc_type: docType,
        description,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
        storage_path: storagePath,
        status: "active",
      })
      .select("*")
      .single();

    if (insertError) {
      logger.error("compensation.upload_document.insert_failed", {
        userId: ctx.userId,
        error: insertError.message,
      });
      return apiFail(
        "INTERNAL",
        "Failed to save document metadata",
        undefined,
        500
      );
    }

    const docId = (data as any)?.id;
    logEvent({
      ctx,
      action: "document.upload",
      resourceType: "document",
      resourceId: docId,
      metadata: { method: "POST", doc_type: docType },
      req,
    }).catch(() => {});
    logger.info("compensation.upload_document.success", {
      userId: ctx.userId,
      documentId: docId,
    });
    return NextResponse.json({ document: data });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.upload_document.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
