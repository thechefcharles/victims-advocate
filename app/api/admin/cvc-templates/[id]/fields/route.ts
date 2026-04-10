/**
 * Domain 2.3 — CVC Form Processing: list/create fields on a template.
 * GET  /api/admin/cvc-templates/:id/fields
 * POST /api/admin/cvc-templates/:id/fields
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createCvcFormField, getCvcFormTemplate } from "@/lib/server/cvcForms";
import { getCvcFormFieldsByTemplateId } from "@/lib/server/cvcForms/cvcFormRepository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_FIELD_TYPES = new Set([
  "text",
  "textarea",
  "checkbox",
  "date",
  "currency",
  "signature",
]);

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    // Validate access via the same admin gate as the parent template
    await getCvcFormTemplate(ctx, id, supabase);
    const fields = await getCvcFormFieldsByTemplateId(supabase, id);

    return NextResponse.json({ fields });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const fieldKey = body.field_key;
    const fieldType = body.field_type;
    if (typeof fieldKey !== "string" || fieldKey.length === 0) {
      throw new AppError("VALIDATION_ERROR", "field_key is required.", undefined, 422);
    }
    if (typeof fieldType !== "string" || !VALID_FIELD_TYPES.has(fieldType)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "field_type must be one of: text, textarea, checkbox, date, currency, signature.",
        undefined,
        422,
      );
    }

    const supabase = getSupabaseAdmin();
    const result = await createCvcFormField(
      ctx,
      id,
      {
        field_key: fieldKey,
        field_type: fieldType as "text" | "textarea" | "checkbox" | "date" | "currency" | "signature",
        label: typeof body.label === "string" ? body.label : null,
        page_number: typeof body.page_number === "number" ? body.page_number : null,
        x: typeof body.x === "number" ? body.x : null,
        y: typeof body.y === "number" ? body.y : null,
        font_size: typeof body.font_size === "number" ? body.font_size : null,
        required: body.required === true,
        source_path: typeof body.source_path === "string" ? body.source_path : null,
      },
      supabase,
    );

    return NextResponse.json({ field: result }, { status: 201 });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
