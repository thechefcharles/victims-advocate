/**
 * Domain 2.3 — CVC Form Processing: list/create alignment mappings on a template.
 * GET  /api/admin/cvc-templates/:id/mappings
 * POST /api/admin/cvc-templates/:id/mappings
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  createFormAlignmentMapping,
  getCvcFormTemplate,
} from "@/lib/server/cvcForms";
import { getAlignmentMappingsByTemplateId } from "@/lib/server/cvcForms/cvcFormRepository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_PURPOSES = new Set(["intake", "eligibility", "output", "computed"]);

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    await getCvcFormTemplate(ctx, id, supabase); // admin gate
    const mappings = await getAlignmentMappingsByTemplateId(supabase, id);

    return NextResponse.json({ mappings });
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

    const cvcFormFieldId = body.cvc_form_field_id;
    const canonicalKey = body.canonical_field_key;
    const purpose = body.mapping_purpose;

    if (typeof cvcFormFieldId !== "string" || cvcFormFieldId.length === 0) {
      throw new AppError("VALIDATION_ERROR", "cvc_form_field_id is required.", undefined, 422);
    }
    if (typeof canonicalKey !== "string" || canonicalKey.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "canonical_field_key is required.",
        undefined,
        422,
      );
    }
    if (typeof purpose !== "string" || !VALID_PURPOSES.has(purpose)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "mapping_purpose must be one of: intake, eligibility, output, computed.",
        undefined,
        422,
      );
    }

    const supabase = getSupabaseAdmin();
    const result = await createFormAlignmentMapping(
      ctx,
      id,
      {
        cvc_form_field_id: cvcFormFieldId,
        canonical_field_key: canonicalKey,
        intake_field_path:
          typeof body.intake_field_path === "string" ? body.intake_field_path : null,
        eligibility_field_key:
          typeof body.eligibility_field_key === "string" ? body.eligibility_field_key : null,
        mapping_purpose: purpose as "intake" | "eligibility" | "output" | "computed",
        transform_type: typeof body.transform_type === "string" ? body.transform_type : null,
        transform_config:
          body.transform_config && typeof body.transform_config === "object"
            ? (body.transform_config as Record<string, unknown>)
            : null,
        required: body.required === true,
      },
      supabase,
    );

    return NextResponse.json({ mapping: result }, { status: 201 });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
