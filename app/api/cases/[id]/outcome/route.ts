/**
 * Domain 1.2 — Case: record outcome (approved / denied).
 * POST /api/cases/:id/outcome
 *
 * Thin handler. Business logic in caseService.recordCaseOutcome.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { recordCaseOutcome } from "@/lib/server/cases/caseService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    if (body.outcome !== "approved" && body.outcome !== "denied") {
      return NextResponse.json(
        { error: "outcome must be 'approved' or 'denied'." },
        { status: 422 },
      );
    }

    const supabase = getSupabaseAdmin();
    const result = await recordCaseOutcome(ctx, id, { outcome: body.outcome }, supabase);

    return NextResponse.json({ case: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
