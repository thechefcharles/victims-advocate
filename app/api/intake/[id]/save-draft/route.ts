/**
 * Domain 2.1 — Intake: save draft (autosave + step submit).
 * PATCH /api/intake/:id/save-draft
 *
 * Thin handler. Business logic in intakeService.saveIntakeDraft.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { saveIntakeDraft } from "@/lib/server/intake";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const draftPayload = body.draft_payload;
    if (!draftPayload || typeof draftPayload !== "object") {
      throw new AppError(
        "VALIDATION_ERROR",
        "draft_payload must be an object.",
        undefined,
        422,
      );
    }

    const supabase = getSupabaseAdmin();
    const result = await saveIntakeDraft(
      ctx,
      id,
      {
        draftPayload: draftPayload as Record<string, unknown>,
        stepKey: typeof body.step_key === "string" ? body.step_key : undefined,
      },
      supabase,
    );

    return NextResponse.json({ intake: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
