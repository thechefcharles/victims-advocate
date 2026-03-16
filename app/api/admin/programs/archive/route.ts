/**
 * Phase 11: Admin – archive an active program definition.
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

    const { data: updated, error } = await supabase
      .from("program_definitions")
      .update({
        is_active: false,
        status: "archived",
        updated_at: new Date().toISOString(),
        updated_by: ctx.userId,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    if (!updated) return apiFail("NOT_FOUND", "Program definition not found", undefined, 404);

    const program = updated as { program_key: string };

    await logEvent({
      ctx,
      action: "routing.program_definition_archive",
      resourceType: "program_definition",
      resourceId: id,
      metadata: { program_key: program.program_key },
      req,
    }).catch(() => {});

    logger.info("admin.programs.archive", { id, userId: ctx.userId });
    return apiOk({ program: updated });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.programs.archive.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
