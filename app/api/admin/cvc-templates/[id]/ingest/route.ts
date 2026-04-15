/**
 * POST /api/admin/cvc-templates/[id]/ingest
 *   Body: multipart/form-data with field `file` containing the PDF.
 *   Effect: parses the PDF's AcroForm and upserts cvc_form_fields rows.
 *
 * Admin only. Emits `cvc_template.pdf_ingested` audit event.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ingestCvcPdf } from "@/lib/server/cvcForms/pdfIngestionService";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB sanity cap

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only.", undefined, 403);
    }
    const { id } = await context.params;
    if (!id) return apiFail("VALIDATION_ERROR", "Missing template id.");

    const form = await req.formData().catch(() => null);
    if (!form) return apiFail("VALIDATION_ERROR", "multipart/form-data required.");
    const file = form.get("file");
    if (!(file instanceof File)) {
      return apiFail("VALIDATION_ERROR", "Missing 'file' part.");
    }
    if (file.size === 0) return apiFail("VALIDATION_ERROR", "Empty file.");
    if (file.size > MAX_PDF_BYTES) {
      return apiFail("VALIDATION_ERROR", "PDF exceeds 25 MB cap.");
    }
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await ingestCvcPdf(buffer, id, getSupabaseAdmin());

    await logEvent({
      ctx,
      action: "cvc_template.pdf_ingested",
      resourceType: "cvc_form_template",
      resourceId: id,
      metadata: {
        fields_created: result.fieldsCreated,
        fields_updated: result.fieldsUpdated,
        skipped: result.skipped,
        total_extracted: result.fields.length,
        file_size_bytes: file.size,
        file_name: file.name,
      },
    });

    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.cvc_templates.ingest.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
