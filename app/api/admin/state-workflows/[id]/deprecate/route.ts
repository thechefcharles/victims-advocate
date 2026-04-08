/**
 * Domain 2.2 — State Workflows: deprecate an active config (active → deprecated).
 * POST /api/admin/state-workflows/:id/deprecate
 *
 * Platform admin only.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { deprecateStateWorkflowConfig } from "@/lib/server/stateWorkflows";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const result = await deprecateStateWorkflowConfig(ctx, id, supabase);

    return NextResponse.json({ config: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
