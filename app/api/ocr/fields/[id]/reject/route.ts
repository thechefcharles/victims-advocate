/**
 * Phase 13: Reject an extracted OCR field (mark as not valid).
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCaseById } from "@/lib/server/data";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id: fieldId } = await context.params;

    if (!fieldId) {
      return apiFail("VALIDATION_ERROR", "Field id required", undefined, 400);
    }

    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.trim() || null : null;

    const supabase = getSupabaseAdmin();
    const { data: field, error: fetchErr } = await supabase
      .from("ocr_extracted_fields")
      .select("id, case_id, organization_id, field_key")
      .eq("id", fieldId)
      .single();

    if (fetchErr || !field) {
      return apiFail("NOT_FOUND", "OCR field not found", undefined, 404);
    }

    const row = field as { case_id: string };
    const caseResult = await getCaseById({ caseId: row.case_id, ctx });
    if (!caseResult) {
      return apiFail("FORBIDDEN", "Access denied", undefined, 403);
    }
    if (!caseResult.access.can_edit && caseResult.access.role === "owner") {
      return apiFail("FORBIDDEN", "Only advocates or admins can review OCR fields", undefined, 403);
    }

    const { data: updated, error } = await supabase
      .from("ocr_extracted_fields")
      .update({
        status: "rejected",
        reviewed_by: ctx.userId,
        reviewed_at: new Date().toISOString(),
        correction_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fieldId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await logEvent({
      ctx,
      action: "ocr.field_rejected",
      resourceType: "ocr_field",
      resourceId: fieldId,
      metadata: { field_key: (field as { field_key: string }).field_key, case_id: row.case_id },
      req,
    }).catch(() => {});

    logger.info("ocr.field.reject", { fieldId, userId: ctx.userId });
    return apiOk({ field: updated });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("ocr.fields.reject.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
