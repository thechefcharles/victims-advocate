/**
 * Phase 4: Admin – list and create policy documents.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";

const DOC_TYPES = ["terms_of_use", "privacy_policy", "ai_disclaimer", "non_legal_advice"] as const;
const ROLES = ["victim", "advocate", "admin"] as const;

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("policy_documents")
      .select("id, created_at, updated_at, doc_type, version, title, is_active, applies_to_role, workflow_key, created_by")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return apiOk({ policies: data ?? [] });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.policies.list.error", { code: appErr.code, message: appErr.message });
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

    const docType = typeof body.doc_type === "string" ? body.doc_type.trim() : "";
    const version = typeof body.version === "string" ? body.version.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content : "";
    const appliesToRole =
      body.applies_to_role != null && body.applies_to_role !== ""
        ? (body.applies_to_role as string).trim()
        : null;
    const workflowKey =
      body.workflow_key != null && body.workflow_key !== ""
        ? (body.workflow_key as string).trim()
        : null;

    if (!DOC_TYPES.includes(docType as (typeof DOC_TYPES)[number])) {
      return apiFail(
        "VALIDATION_ERROR",
        `doc_type must be one of: ${DOC_TYPES.join(", ")}`,
        undefined,
        422
      );
    }
    if (!version) {
      return apiFail("VALIDATION_ERROR", "version is required", undefined, 422);
    }
    if (!title) {
      return apiFail("VALIDATION_ERROR", "title is required", undefined, 422);
    }
    if (appliesToRole && !ROLES.includes(appliesToRole as (typeof ROLES)[number])) {
      return apiFail(
        "VALIDATION_ERROR",
        `applies_to_role must be one of: ${ROLES.join(", ")} or null`,
        undefined,
        422
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("policy_documents")
      .insert({
        doc_type: docType,
        version,
        title,
        content,
        is_active: false,
        applies_to_role: appliesToRole,
        workflow_key: workflowKey,
        created_by: ctx.userId,
      })
      .select("id, created_at, doc_type, version, title, is_active")
      .single();

    if (error) throw new Error(error.message);

    await logEvent({
      ctx,
      action: "policy.create",
      resourceType: "policy_document",
      resourceId: data.id,
      metadata: {
        doc_type: data.doc_type,
        version: data.version,
        workflow_key: workflowKey,
        applies_to_role: appliesToRole,
      },
      req,
    });

    return apiOk(data, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.policies.create.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
