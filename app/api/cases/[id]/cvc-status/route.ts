/**
 * Domain 2.3 — CVC Form Processing: latest job status route.
 * GET /api/cases/:id/cvc-status
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCvcFormGenerationStatus } from "@/lib/server/cvcForms";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const job = await getCvcFormGenerationStatus(ctx, id, supabase);

    return NextResponse.json({ job });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
