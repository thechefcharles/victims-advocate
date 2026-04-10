/**
 * Domain 2.1 — Intake: lock a session against further edits.
 * POST /api/intake/:id/lock
 *
 * Platform admin only. Thin handler. Business logic in intakeService.lockIntake.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { lockIntake } from "@/lib/server/intake";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const result = await lockIntake(ctx, id, supabase);

    return NextResponse.json({ intake: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
