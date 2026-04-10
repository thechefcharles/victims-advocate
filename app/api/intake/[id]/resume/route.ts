/**
 * Domain 2.1 — Intake: resume a draft session.
 * GET /api/intake/:id/resume
 *
 * Thin handler. Business logic in intakeService.resumeIntake.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resumeIntake } from "@/lib/server/intake";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const result = await resumeIntake(ctx, id, supabase);

    return NextResponse.json({ intake: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
