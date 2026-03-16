/**
 * Phase 11: Admin – activate a draft program (one active version per program_key).
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const body = await req.json().catch(() => null);
    const id = body?.id ?? body?.program_id;
    if (!id || typeof id !== "string") {
      return apiFail("VALIDATION_ERROR", "id is required", undefined, 422);
    }

    const supabase = getSupabaseAdmin();

    const { data: program, error: fetchErr } = await supabase
      .from("program_definitions")
      .select("id, program_key, status")
      .eq("id", id)
      .single();

    if (fetchErr || !program) {
      return apiFail("NOT_FOUND", "Program definition not found", undefined, 404);
    }

    const row = program as { program_key: string; status: string };
    if (row.status !== "draft") {
      return apiFail(
        "VALIDATION_ERROR",
        "Only draft programs can be activated",
        undefined,
        422
      );
    }

    const { error: deactivateErr } = await supabase
      .from("program_definitions")
      .update({
        is_active: false,
        status: "archived",
        updated_at: new Date().toISOString(),
        updated_by: ctx.userId,
      })
      .eq("program_key", row.program_key)
      .eq("is_active", true);

    if (deactivateErr) throw new Error(deactivateErr.message);

    const { data: activated, error: activateErr } = await supabase
      .from("program_definitions")
      .update({
        is_active: true,
        status: "active",
        updated_at: new Date().toISOString(),
        updated_by: ctx.userId,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (activateErr) throw new Error(activateErr.message);

    await logEvent({
      ctx,
      action: "routing.program_definition_activate",
      resourceType: "program_definition",
      resourceId: id,
      metadata: { program_key: row.program_key },
      req,
    }).catch(() => {});

    logger.info("admin.programs.activate", { id, program_key: row.program_key, userId: ctx.userId });
    return apiOk({ program: activated });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.programs.activate.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
