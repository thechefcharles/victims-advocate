/**
 * Phase 10: Admin – update a knowledge entry (draft or create new version).
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { KnowledgeCategory } from "@/lib/server/knowledge";

const CATEGORIES: KnowledgeCategory[] = [
  "eligibility",
  "documents",
  "timeline",
  "rights",
  "definitions",
  "faq",
  "program_overview",
];

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

    const id = body.id ?? body.entry_id;
    if (!id || typeof id !== "string") {
      return apiFail("VALIDATION_ERROR", "id is required", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error: fetchErr } = await supabase
      .from("knowledge_entries")
      .select("id, status, entry_key")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return apiFail("NOT_FOUND", "Knowledge entry not found", undefined, 404);
    }

    if ((existing as { status: string }).status !== "draft") {
      return apiFail(
        "VALIDATION_ERROR",
        "Only draft entries can be updated. Activate or create a new version for published content.",
        undefined,
        422
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    };

    if (typeof body.title === "string") updates.title = body.title.trim();
    if (typeof body.body === "string") updates.body = body.body;
    if (typeof body.content === "string") updates.body = body.content;
    if (body.category && CATEGORIES.includes(body.category)) updates.category = body.category;
    if (body.state_code !== undefined) updates.state_code = body.state_code || null;
    if (body.program_key !== undefined) updates.program_key = body.program_key || null;
    if (body.audience_role !== undefined) updates.audience_role = body.audience_role || null;
    if (body.workflow_key !== undefined) updates.workflow_key = body.workflow_key || null;
    if (body.structured_data && typeof body.structured_data === "object")
      updates.structured_data = body.structured_data;
    if (Array.isArray(body.tags)) updates.tags = body.tags.filter((t: unknown) => typeof t === "string");
    if (typeof body.source_label === "string") updates.source_label = body.source_label.trim() || null;
    if (typeof body.source_url === "string") updates.source_url = body.source_url.trim() || null;

    const { data: updated, error } = await supabase
      .from("knowledge_entries")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await logEvent({
      ctx,
      action: "knowledge.update",
      resourceType: "knowledge_entry",
      resourceId: id,
      metadata: { entry_key: (existing as { entry_key: string }).entry_key },
      req,
    }).catch(() => {});

    logger.info("admin.knowledge.update", { id, userId: ctx.userId });
    return apiOk({ entry: updated });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.knowledge.update.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
