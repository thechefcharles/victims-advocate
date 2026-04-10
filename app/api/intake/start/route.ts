/**
 * Domain 2.1 — Intake: start a new session.
 * POST /api/intake/start
 *
 * Thin handler. Business logic in intakeService.startIntake.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { startIntake } from "@/lib/server/intake";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => ({}));
    const stateCode = body.state_code as "IL" | "IN" | undefined;

    if (stateCode !== "IL" && stateCode !== "IN") {
      throw new AppError("VALIDATION_ERROR", "state_code must be 'IL' or 'IN'.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const result = await startIntake(
      ctx,
      {
        state_code: stateCode,
        case_id: typeof body.case_id === "string" ? body.case_id : null,
        support_request_id:
          typeof body.support_request_id === "string" ? body.support_request_id : null,
        organization_id:
          typeof body.organization_id === "string" ? body.organization_id : null,
      },
      supabase,
    );

    return NextResponse.json({ intake: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
