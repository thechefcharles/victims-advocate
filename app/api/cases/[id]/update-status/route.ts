/**
 * Domain 1.2 — Case: generic status transition endpoint.
 * POST /api/cases/:id/update-status
 *
 * Routes to the appropriate service method based on toState.
 * Thin handler — all validation in service layer.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { startCaseProgress, pauseCaseForApplicant } from "@/lib/server/cases/caseService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ALLOWED_STATES = ["in_progress", "awaiting_applicant", "awaiting_provider"] as const;
type AllowedState = (typeof ALLOWED_STATES)[number];

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const toState = body.status as AllowedState | undefined;

    if (!toState || !ALLOWED_STATES.includes(toState)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_STATES.join(", ")}` },
        { status: 422 },
      );
    }

    const supabase = getSupabaseAdmin();

    let result;
    if (toState === "in_progress") {
      result = await startCaseProgress(ctx, id, supabase);
    } else if (toState === "awaiting_applicant" || toState === "awaiting_provider") {
      result = await pauseCaseForApplicant(ctx, id, supabase);
    } else {
      throw new AppError("VALIDATION_ERROR", "Unhandled state transition.", undefined, 422);
    }

    return NextResponse.json({ case: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
