/**
 * Domain 2.4: Translation / i18n — translation mapping set list/create.
 * GET  /api/translation/mapping-sets       → list (admin-only via service gate)
 * POST /api/translation/mapping-sets       → create draft (admin-only)
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  listTranslationMappingSets,
  createTranslationMappingSet,
} from "@/lib/server/translation";
import type { LocaleCode } from "@/lib/registry";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const url = new URL(req.url);
    const stateCode = url.searchParams.get("state_code");
    const locale = url.searchParams.get("locale");

    if (stateCode && stateCode !== "IL" && stateCode !== "IN") {
      throw new AppError("VALIDATION_ERROR", "state_code must be 'IL' or 'IN'.", undefined, 422);
    }
    if (locale && locale !== "en" && locale !== "es") {
      throw new AppError("VALIDATION_ERROR", "locale must be 'en' or 'es'.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const result = await listTranslationMappingSets(
      ctx,
      {
        stateCode: (stateCode as "IL" | "IN" | null) ?? undefined,
        locale: (locale as LocaleCode | null) ?? undefined,
      },
      supabase,
    );

    return NextResponse.json({ mapping_sets: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => ({}));
    const stateCode = body.state_code;
    const locale = body.locale;
    const displayName = body.display_name;

    if (stateCode !== "IL" && stateCode !== "IN") {
      throw new AppError("VALIDATION_ERROR", "state_code must be 'IL' or 'IN'.", undefined, 422);
    }
    if (locale !== "en" && locale !== "es") {
      throw new AppError("VALIDATION_ERROR", "locale must be 'en' or 'es'.", undefined, 422);
    }
    if (typeof displayName !== "string" || displayName.length === 0) {
      throw new AppError("VALIDATION_ERROR", "display_name is required.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const result = await createTranslationMappingSet(
      ctx,
      {
        state_code: stateCode,
        locale: locale as LocaleCode,
        display_name: displayName,
        state_workflow_config_id:
          typeof body.state_workflow_config_id === "string" ? body.state_workflow_config_id : null,
      },
      supabase,
    );

    return NextResponse.json({ mapping_set: result }, { status: 201 });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
