/**
 * Domain 2.2 — State Workflows: get the active config for a state.
 * GET /api/state-workflows/:stateCode/active
 *
 * Allowed for any authenticated user.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getActiveStateWorkflowConfig } from "@/lib/server/stateWorkflows";

interface RouteParams {
  params: Promise<{ stateCode: string }>;
}

function assertStateCode(value: string): "IL" | "IN" {
  if (value !== "IL" && value !== "IN") {
    throw new AppError("VALIDATION_ERROR", "stateCode must be 'IL' or 'IN'.", undefined, 422);
  }
  return value;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { stateCode } = await context.params;
    const stateCodeTyped = assertStateCode(stateCode);

    const supabase = getSupabaseAdmin();
    const result = await getActiveStateWorkflowConfig(ctx, stateCodeTyped, supabase);

    return NextResponse.json({ config: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
