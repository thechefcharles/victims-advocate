/**
 * Domain 2.2 — State Workflows: resolve the active intake schema for a state.
 * GET /api/state-workflows/:stateCode/intake-schema
 *
 * Allowed for any authenticated user.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveActiveIntakeSchema, resolveIntakeSchema } from "@/lib/server/stateWorkflows";

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
    const result = configId
      ? await resolveIntakeSchema(supabase, stateCode, configId)
      : await resolveActiveIntakeSchema(supabase, stateCode);

    return NextResponse.json({ intake_schema: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
