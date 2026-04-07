/**
 * Domain 1.2 — Case: close a case.
 * POST /api/cases/:id/close
 *
 * Thin handler. Business logic in caseService.closeCase.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { closeCase } from "@/lib/server/cases/caseService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const result = await closeCase(ctx, id, supabase);

    return NextResponse.json({ case: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
