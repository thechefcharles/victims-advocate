/**
 * Domain 2.2 — State Workflows: resolve document requirement set for a state.
 * GET /api/state-workflows/:stateCode/document-requirements
 *
 * Allowed for any authenticated user.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveDocumentRequirementSet } from "@/lib/server/stateWorkflows";

interface RouteParams {
  params: Promise<{ stateCode: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { stateCode } = await context.params;
    if (stateCode !== "IL" && stateCode !== "IN") {
      throw new AppError("VALIDATION_ERROR", "stateCode must be 'IL' or 'IN'.", undefined, 422);
    }

    const url = new URL(req.url);
    const configId = url.searchParams.get("config_id");

    const supabase = getSupabaseAdmin();
    const result = await resolveDocumentRequirementSet(supabase, stateCode, configId);

    return NextResponse.json({ document_requirement_set: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
