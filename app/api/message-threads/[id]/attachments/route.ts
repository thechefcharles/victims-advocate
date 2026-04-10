/**
 * Domain 1.4 — POST /api/message-threads/[id]/attachments
 * Completes Domain 1.3 deferred item: attachment upload to a message thread.
 * Returns { data: { document: DocumentApplicantView, threadId }, error: null }.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { attachToMessage } from "@/lib/server/documents/documentService";
import { validateUpload } from "@/lib/server/documents/uploadValidation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const runtime = "nodejs";

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id: threadId } = await context.params;
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const validation = validateUpload(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] ?? "File validation failed" },
        { status: 422 },
      );
    }

    const supabase = getSupabaseAdmin();
    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".") + 1) : "bin";
    const storagePath = `${ctx.userId}/attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("case-documents")
      .upload(storagePath, file, { cacheControl: "3600", upsert: false, contentType: file.type || "application/octet-stream" });

    if (uploadError) {
      return NextResponse.json({ error: "File upload failed" }, { status: 500 });
    }

    const actor = buildActor(ctx);
    const document = await attachToMessage(
      actor,
      threadId,
      {
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
        file_size: file.size,
        organization_id: ctx.orgId ?? null,
        linked_object_type: "message_thread",
        linked_object_id: threadId,
      },
      supabase,
    );

    return NextResponse.json({ data: { document, threadId }, error: null }, { status: 201 });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("message-threads.attachments.post.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
