/**
 * Domain 2.4: Translation / i18n — publish a draft mapping set.
 * POST /api/translation/mapping-sets/:id/publish
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { publishTranslationMappingSet } from "@/lib/server/translation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const result = await publishTranslationMappingSet(ctx, id, supabase);

    return NextResponse.json({ mapping_set: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
