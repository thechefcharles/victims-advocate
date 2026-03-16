/**
 * Phase 4: Admin – activate a policy version (deactivates prior active for same slot).
 */

import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);
    if (!ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Admin only", undefined, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 422);
    }

    const policyId = typeof body.policy_id === "string" ? body.policy_id.trim() : "";
    if (!policyId) {
      return apiFail("VALIDATION_ERROR", "policy_id is required", undefined, 422);
    }

    const supabase = getSupabaseAdmin();
    const { data: policy, error: fetchErr } = await supabase
      .from("policy_documents")
      .select("id, doc_type, version, applies_to_role, workflow_key")
      .eq("id", policyId)
      .maybeSingle();

    if (fetchErr || !policy) {
      return apiFail("NOT_FOUND", "Policy not found", undefined, 404);
    }

    let deactivateQuery = supabase
      .from("policy_documents")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("doc_type", policy.doc_type)
      .eq("is_active", true);

    if (policy.applies_to_role != null) {
      deactivateQuery = deactivateQuery.eq("applies_to_role", policy.applies_to_role);
    } else {
      deactivateQuery = deactivateQuery.is("applies_to_role", null);
    }
    if (policy.workflow_key != null) {
      deactivateQuery = deactivateQuery.eq("workflow_key", policy.workflow_key);
    } else {
      deactivateQuery = deactivateQuery.is("workflow_key", null);
    }

    const { error: deactivateErr } = await deactivateQuery;
    if (deactivateErr) throw new Error(deactivateErr.message);

    const { data: updated, error: activateErr } = await supabase
      .from("policy_documents")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", policyId)
      .select("id, doc_type, version, is_active")
      .single();

    if (activateErr) throw new Error(activateErr.message);

    await logEvent({
      ctx,
      action: "policy.activate",
      resourceType: "policy_document",
      resourceId: updated.id,
      metadata: {
        doc_type: updated.doc_type,
        version: updated.version,
        applies_to_role: policy.applies_to_role,
        workflow_key: policy.workflow_key,
      },
      req,
    });

    return apiOk(updated);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("admin.policies.activate.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
