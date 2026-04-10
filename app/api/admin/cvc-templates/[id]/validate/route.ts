/**
 * Domain 2.3 — CVC Form Processing: explicit alignment validation preview.
 * POST /api/admin/cvc-templates/:id/validate
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { validateAlignment } from "@/lib/server/cvcForms";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const result = await validateAlignment(ctx, id, supabase);

    return NextResponse.json({ validation: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
