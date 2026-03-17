/**
 * Phase 10: Admin – activate a draft knowledge entry (deactivates prior active for same entry_key).
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

    const { data: entry, error: fetchErr } = await supabase
      .from("knowledge_entries")
      .select("id, entry_key, status")
      .eq("id", id)
      .single();

    if (fetchErr || !entry) {
      return apiFail("NOT_FOUND", "Knowledge entry not found", undefined, 404);
    }

    const row = entry as { entry_key: string; status: string };
    if (row.status !== "draft") {
      return apiFail(
        "VALIDATION_ERROR",
        "Only draft entries can be activated",
        undefined,
        422
      );
    }

    const { error: deactivateErr } = await supabase
      .from("knowledge_entries")
      .update({ is_active: false, status: "archived", updated_at: new Date().toISOString(), updated_by: ctx.userId })
      .eq("entry_key", row.entry_key)
      .eq("is_active", true);

    if (deactivateErr) throw new Error(deactivateErr.message);

    const { data: activated, error: activateErr } = await supabase
      .from("knowledge_entries")
      .update({
        is_active: true,
        status: "active",
        effective_at: new Date().toISOString(),
        last_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: ctx.userId,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (activateErr) throw new Error(activateErr.message);

    await logEvent({
      ctx,
      action: "knowledge.activate",
      resourceType: "knowledge_entry",
      resourceId: id,
      metadata: { entry_key: row.entry_key },
      req,
    }).catch(() => {});

    logger.info("admin.knowledge.activate", { id, entry_key: row.entry_key, userId: ctx.userId });
    return apiOk({ entry: activated });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.knowledge.activate.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
