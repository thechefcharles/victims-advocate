/**
 * Domain 2.1 — Intake: read a session or submission by id.
 * GET /api/intake/:id?type=session|submission
 *
 * Thin handler. Business logic in intakeService.getIntake.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getIntake } from "@/lib/server/intake";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const url = new URL(req.url);
    const intakeType = url.searchParams.get("type") ?? "session";
    if (intakeType !== "session" && intakeType !== "submission") {
      throw new AppError(
        "VALIDATION_ERROR",
        "type must be 'session' or 'submission'.",
        undefined,
        422,
      );
    }

    const supabase = getSupabaseAdmin();
    const result = await getIntake(ctx, id, intakeType, supabase);

    return NextResponse.json({ intake: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
