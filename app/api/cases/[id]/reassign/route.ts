/**
 * Domain 1.2 — Case: reassign to a different advocate (no status change).
 * POST /api/cases/:id/reassign
 *
 * Thin handler. All business logic in caseAssignmentService.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { reassignCase } from "@/lib/server/cases/caseAssignmentService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    if (!body.advocate_id) {
      return NextResponse.json(
        { error: "advocate_id is required." },
        { status: 422 },
      );
    }

    const supabase = getSupabaseAdmin();
    const result = await reassignCase(ctx, id, body.advocate_id, supabase);

    return NextResponse.json({ case: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
