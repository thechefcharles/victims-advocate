/**
 * Phase 10: Admin – list and create knowledge entries.
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

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const url = new URL(req.url);
    const category = url.searchParams.get("category") as KnowledgeCategory | null;
    const stateCode = url.searchParams.get("stateCode") ?? url.searchParams.get("state_code");
    const programKey = url.searchParams.get("programKey") ?? url.searchParams.get("program_key");
    const status = url.searchParams.get("status");
    const query = url.searchParams.get("query");

    const supabase = getSupabaseAdmin();
    let q = supabase.from("knowledge_entries").select("*").order("updated_at", { ascending: false });

    if (category && CATEGORIES.includes(category)) q = q.eq("category", category);
    if (stateCode != null && stateCode !== "") q = q.eq("state_code", stateCode);
    if (programKey != null && programKey !== "") q = q.eq("program_key", programKey);
    if (status === "draft" || status === "active" || status === "archived") q = q.eq("status", status);
    if (query?.trim()) {
      const term = `%${query.trim()}%`;
      q = q.or(`title.ilike.${term},body.ilike.${term}`);
    }

    const { data, error } = await q.limit(200);

    if (error) throw new Error(error.message);

    return apiOk({ entries: data ?? [] });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.knowledge.list.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 422);
    }

    const entryKey = typeof body.entry_key === "string" ? body.entry_key.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.body === "string" ? body.body : typeof body.content === "string" ? body.content : "";
    const category = (body.category ?? body.category_id) as string;
    if (!entryKey || !title || !CATEGORIES.includes(category as KnowledgeCategory)) {
      return apiFail(
        "VALIDATION_ERROR",
        "entry_key, title, and category (eligibility|documents|timeline|rights|definitions|faq|program_overview) are required",
        undefined,
        422
      );
    }

    const version = typeof body.version === "string" ? body.version.trim() || "1" : "1";
    const stateCode = body.state_code ?? body.stateCode ?? null;
    const programKey = body.program_key ?? body.programKey ?? null;
    const audienceRole = body.audience_role ?? body.audienceRole ?? null;
    const workflowKey = body.workflow_key ?? body.workflowKey ?? null;
    const structuredData =
      body.structured_data && typeof body.structured_data === "object"
        ? body.structured_data
        : {};
    const tags = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : null;
    const sourceLabel = typeof body.source_label === "string" ? body.source_label.trim() || null : null;
    const sourceUrl = typeof body.source_url === "string" ? body.source_url.trim() || null : null;

    const supabase = getSupabaseAdmin();
    const { data: inserted, error } = await supabase
      .from("knowledge_entries")
      .insert({
        entry_key: entryKey,
        title,
        body: content,
        category,
        version,
        status: "draft",
        is_active: false,
        state_code: stateCode || null,
        program_key: programKey || null,
        audience_role: audienceRole || null,
        workflow_key: workflowKey || null,
        structured_data: structuredData,
        tags,
        source_label: sourceLabel,
        source_url: sourceUrl,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await logEvent({
      ctx,
      action: "knowledge.create",
      resourceType: "knowledge_entry",
      resourceId: (inserted as { id: string })?.id,
      metadata: { entry_key: entryKey, category },
      req,
    }).catch(() => {});

    logger.info("admin.knowledge.create", { entryKey, userId: ctx.userId });
    return apiOk({ entry: inserted });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.knowledge.create.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
