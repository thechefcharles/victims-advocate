/**
 * Phase 11: Admin – list and create program definitions.
 */

import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";

const SCOPE_TYPES = ["state", "federal", "local", "general"] as const;

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const stateCode = url.searchParams.get("stateCode") ?? url.searchParams.get("state_code");
    const isActive = url.searchParams.get("isActive");

    const supabase = getSupabaseAdmin();
    let q = supabase.from("program_definitions").select("*").order("program_key");

    if (status === "draft" || status === "active" || status === "archived") q = q.eq("status", status);
    if (stateCode != null && stateCode !== "") q = q.eq("state_code", stateCode);
    if (isActive === "true") q = q.eq("is_active", true);
    if (isActive === "false") q = q.eq("is_active", false);

    const { data, error } = await q.limit(200);

    if (error) throw new Error(error.message);

    return apiOk({ programs: data ?? [] });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.programs.list.error", { code: appErr.code, message: appErr.message });
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
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
    }

    const programKey = typeof body.program_key === "string" ? body.program_key.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!programKey || !name) {
      return apiFail("VALIDATION_ERROR", "program_key and name are required", undefined, 422);
    }

    const scopeType = body.scope_type ?? "state";
    if (!SCOPE_TYPES.includes(scopeType)) {
      return apiFail("VALIDATION_ERROR", "scope_type must be state|federal|local|general", undefined, 422);
    }

    const description = typeof body.description === "string" ? body.description.trim() || null : null;
    const stateCode = typeof body.state_code === "string" ? body.state_code.trim() || null : null;
    const version = typeof body.version === "string" ? body.version.trim() || "1" : "1";
    const ruleSet = body.rule_set && typeof body.rule_set === "object" ? body.rule_set : {};
    const requiredDocuments = Array.isArray(body.required_documents) ? body.required_documents : [];
    const deadlineMetadata = body.deadline_metadata && typeof body.deadline_metadata === "object" ? body.deadline_metadata : {};
    const dependencyRules = body.dependency_rules && typeof body.dependency_rules === "object" ? body.dependency_rules : {};
    const stackingRules = body.stacking_rules && typeof body.stacking_rules === "object" ? body.stacking_rules : {};
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};

    const supabase = getSupabaseAdmin();
    const { data: inserted, error } = await supabase
      .from("program_definitions")
      .insert({
        program_key: programKey,
        name,
        description,
        state_code: stateCode,
        scope_type: scopeType,
        status: "draft",
        is_active: false,
        version,
        rule_set: ruleSet,
        required_documents: requiredDocuments,
        deadline_metadata: deadlineMetadata,
        dependency_rules: dependencyRules,
        stacking_rules: stackingRules,
        metadata,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await logEvent({
      ctx,
      action: "routing.program_definition_create",
      resourceType: "program_definition",
      resourceId: (inserted as { id: string })?.id,
      metadata: { program_key: programKey },
      req,
    }).catch(() => {});

    logger.info("admin.programs.create", { programKey, userId: ctx.userId });
    return apiOk({ program: inserted });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.programs.create.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
