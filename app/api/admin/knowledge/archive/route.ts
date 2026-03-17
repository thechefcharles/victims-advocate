/**
 * Phase 10: Admin – archive an active knowledge entry.
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
    const id = body?.id ?? body?.entry_id;
    if (!id || typeof id !== "string") {
      return apiFail("VALIDATION_ERROR", "id is required", undefined, 422);
    }

    const supabase = getSupabaseAdmin();

    const { data: updated, error } = await supabase
      .from("knowledge_entries")
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
    if (!updated) return apiFail("NOT_FOUND", "Knowledge entry not found", undefined, 404);

    const entry = updated as { entry_key: string };

    await logEvent({
      ctx,
      action: "knowledge.archive",
      resourceType: "knowledge_entry",
      resourceId: id,
      metadata: { entry_key: entry.entry_key },
      req,
    }).catch(() => {});

    logger.info("admin.knowledge.archive", { id, userId: ctx.userId });
    return apiOk({ entry: updated });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.knowledge.archive.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
