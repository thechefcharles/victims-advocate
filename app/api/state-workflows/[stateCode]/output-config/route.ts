/**
 * Domain 2.2 — State Workflows: resolve output mapping + form template for a state.
 * GET /api/state-workflows/:stateCode/output-config
 *
 * Returns both the output mapping set (used to render PDFs) and the form
 * template set (used by the UI). Allowed for any authenticated user.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  resolveOutputMappingSet,
  resolveFormTemplateSet,
} from "@/lib/server/stateWorkflows";

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
    const [outputMapping, formTemplate] = await Promise.all([
      resolveOutputMappingSet(supabase, stateCode, configId),
      resolveFormTemplateSet(supabase, stateCode, configId),
    ]);

    return NextResponse.json({
      output_mapping_set: outputMapping,
      form_template_set: formTemplate,
    });
  } catch (err) {
    return apiFailFromError(toAppError(err));
  }
}
