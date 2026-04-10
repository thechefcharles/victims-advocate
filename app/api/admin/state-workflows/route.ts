/**
 * Domain 2.2 — State Workflows: admin list/create.
 * GET  /api/admin/state-workflows  → list all configs (admin context)
 * POST /api/admin/state-workflows  → create a new draft config
 *
 * Platform admin only — enforced by stateWorkflowService via can().
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  listStateWorkflowConfigs,
  createStateWorkflowConfig,
} from "@/lib/server/stateWorkflows";
import type { StateWorkflowConfigStatus } from "@/lib/registry";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const url = new URL(req.url);
    const stateCode = url.searchParams.get("state_code");
    const status = url.searchParams.get("status");

    if (stateCode && stateCode !== "IL" && stateCode !== "IN") {
      throw new AppError("VALIDATION_ERROR", "state_code must be 'IL' or 'IN'.", undefined, 422);
    }
    if (
      status &&
      status !== "draft" &&
      status !== "active" &&
      status !== "deprecated"
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "status must be one of: draft, active, deprecated.",
        undefined,
        422,
      );
    }

    const supabase = getSupabaseAdmin();
    const result = await listStateWorkflowConfigs(
      ctx,
      {
        stateCode: (stateCode as "IL" | "IN" | null) ?? undefined,
        status: (status as StateWorkflowConfigStatus | null) ?? undefined,
      },
      supabase,
    );

    return NextResponse.json({ configs: result });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => ({}));
    const stateCode = body.state_code;
    const displayName = body.display_name;

    if (stateCode !== "IL" && stateCode !== "IN") {
      throw new AppError("VALIDATION_ERROR", "state_code must be 'IL' or 'IN'.", undefined, 422);
    }
    if (typeof displayName !== "string" || displayName.length === 0) {
      throw new AppError("VALIDATION_ERROR", "display_name is required.", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const result = await createStateWorkflowConfig(
      ctx,
      {
        state_code: stateCode,
        display_name: displayName,
        seeded_from: typeof body.seeded_from === "string" ? body.seeded_from : null,
      },
      supabase,
    );

    return NextResponse.json({ config: result }, { status: 201 });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
