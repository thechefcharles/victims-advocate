/**
 * Domain 2.2 — State Workflows: admin get / update.
 * GET   /api/admin/state-workflows/:id  → admin view of a single config
 * PATCH /api/admin/state-workflows/:id  → mutate a draft config
 *
 * Platform admin only.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getStateWorkflowConfigById,
  updateStateWorkflowConfig,
} from "@/lib/server/stateWorkflows";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const result = await getStateWorkflowConfigById(ctx, id, supabase);

    return NextResponse.json({ config: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}

export async function PATCH(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const patch: { display_name?: string } = {};
    if (typeof body.display_name === "string") patch.display_name = body.display_name;

    const supabase = getSupabaseAdmin();
    const result = await updateStateWorkflowConfig(ctx, id, patch, supabase);

    return NextResponse.json({ config: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
