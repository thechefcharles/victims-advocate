/**
 * Domain 2.1 — Intake: amend a submission post-hoc.
 * POST /api/intake/:id/amend
 *
 * NOTE: This is the new domain-2.1 route at /api/intake/[id]/amend.
 * The legacy flat route /api/intake/amend/route.ts is intentionally left
 * untouched and continues to serve the existing intake page.
 *
 * Thin handler. Business logic in intakeService.amendIntakeSubmission.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { amendIntakeSubmission } from "@/lib/server/intake";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const fieldKey = body.field_key;
    if (typeof fieldKey !== "string" || fieldKey.length === 0) {
      throw new AppError("VALIDATION_ERROR", "field_key is required.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const result = await amendIntakeSubmission(
      ctx,
      id,
      {
        fieldKey,
        newValue: body.new_value,
        reason: typeof body.reason === "string" ? body.reason : undefined,
      },
      supabase,
    );

    return NextResponse.json(result);
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
