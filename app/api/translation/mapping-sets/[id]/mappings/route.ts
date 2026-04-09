/**
 * Domain 2.4: Translation / i18n — add a mapping rule to a draft set.
 * POST /api/translation/mapping-sets/:id/mappings
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { addTranslationMapping } from "@/lib/server/translation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const sourceValue = body.source_value;
    const canonicalValue = body.canonical_value;
    if (typeof sourceValue !== "string" || sourceValue.length === 0) {
      throw new AppError("VALIDATION_ERROR", "source_value is required.", undefined, 422);
    }
    if (typeof canonicalValue !== "string" || canonicalValue.length === 0) {
      throw new AppError("VALIDATION_ERROR", "canonical_value is required.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const result = await addTranslationMapping(
      ctx,
      id,
      {
        source_value: sourceValue,
        canonical_value: canonicalValue,
        field_context: typeof body.field_context === "string" ? body.field_context : null,
        locale: body.locale === "en" ? "en" : "es",
        transform_type:
          body.transform_type === "exact_match" ||
          body.transform_type === "contains" ||
          body.transform_type === "regex"
            ? body.transform_type
            : null,
      },
      supabase,
    );

    return NextResponse.json({ mapping: result }, { status: 201 });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
