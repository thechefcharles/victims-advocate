/**
 * Phase 11: Admin – update a draft program definition.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";

const SCOPE_TYPES = ["state", "federal", "local", "general"] as const;

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
    }

    const id = body.id ?? body.program_id;
    if (!id || typeof id !== "string") {
      return apiFail("VALIDATION_ERROR", "id is required", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error: fetchErr } = await supabase
      .from("program_definitions")
      .select("id, status, program_key")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return apiFail("NOT_FOUND", "Program definition not found", undefined, 404);
    }

    const row = existing as { status: string };
    if (row.status !== "draft") {
      return apiFail(
        "VALIDATION_ERROR",
        "Only draft programs can be updated. Archive and create a new version to change active content.",
        undefined,
        422
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    };

    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.description === "string") updates.description = body.description.trim() || null;
    if (body.state_code !== undefined) updates.state_code = body.state_code || null;
    if (body.program_key !== undefined && typeof body.program_key === "string")
      updates.program_key = body.program_key.trim();
    if (body.scope_type && SCOPE_TYPES.includes(body.scope_type)) updates.scope_type = body.scope_type;
    if (typeof body.version === "string") updates.version = body.version.trim();
    if (body.rule_set && typeof body.rule_set === "object") updates.rule_set = body.rule_set;
    if (Array.isArray(body.required_documents)) updates.required_documents = body.required_documents;
    if (body.deadline_metadata && typeof body.deadline_metadata === "object")
      updates.deadline_metadata = body.deadline_metadata;
    if (body.dependency_rules && typeof body.dependency_rules === "object")
      updates.dependency_rules = body.dependency_rules;
    if (body.stacking_rules && typeof body.stacking_rules === "object")
      updates.stacking_rules = body.stacking_rules;
    if (body.metadata && typeof body.metadata === "object") updates.metadata = body.metadata;

    const { data: updated, error } = await supabase
      .from("program_definitions")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await logEvent({
      ctx,
      action: "routing.program_definition_update",
      resourceType: "program_definition",
      resourceId: id,
      metadata: { program_key: (existing as { program_key: string }).program_key },
      req,
    }).catch(() => {});

    logger.info("admin.programs.update", { id, userId: ctx.userId });
    return apiOk({ program: updated });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.programs.update.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
