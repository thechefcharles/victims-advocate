/**
 * Phase 4: Record policy acceptance(s). Append-only; validates active version.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getActivePolicyDocument } from "@/lib/server/policies";
import { logEvent } from "@/lib/server/audit/logEvent";
import { logger } from "@/lib/server/logging";

const DOC_TYPES = ["terms_of_use", "privacy_policy", "ai_disclaimer", "non_legal_advice"] as const;

function parseInet(ip: string | null): string | null {
  if (!ip?.trim()) return null;
  const trimmed = ip.trim();
  if (trimmed.length > 45) return null;
  return trimmed;
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
    }

    const acceptances = Array.isArray(body.policy_ids)
      ? body.policy_ids
      : typeof body.policy_id === "string"
        ? [body.policy_id]
        : [];

    if (acceptances.length === 0) {
      return apiFail("VALIDATION_ERROR", "policy_ids or policy_id required", undefined, 422);
    }

    const workflowKey = typeof body.workflow_key === "string" ? body.workflow_key.trim() || null : null;

    const ip =
      parseInet(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null) ??
      parseInet(req.headers.get("x-real-ip")) ??
      null;
    const userAgent = req.headers.get("user-agent") ?? null;

    const supabase = getSupabaseAdmin();
    const inserted: { id: string; doc_type: string; version: string }[] = [];

    for (const policyId of acceptances) {
      if (typeof policyId !== "string" || !policyId.trim()) continue;

      const { data: activeDoc, error: fetchErr } = await supabase
        .from("policy_documents")
        .select("*")
        .eq("id", policyId.trim())
        .eq("is_active", true)
        .maybeSingle();

      if (fetchErr || !activeDoc) {
        return apiFail(
          "VALIDATION_ERROR",
          "Policy not found or not active; only current active versions can be accepted",
          { policy_id: policyId },
          422
        );
      }

      const activeForContext = await getActivePolicyDocument({
        docType: activeDoc.doc_type as (typeof DOC_TYPES)[number],
        role: ctx.role,
        workflowKey,
      });
      if (!activeForContext || activeForContext.id !== activeDoc.id) {
        return apiFail(
          "VALIDATION_ERROR",
          "This policy version is not the current active one for your context",
          { policy_id: policyId },
          422
        );
      }

      const { error } = await supabase.from("policy_acceptances").insert({
        user_id: ctx.userId,
        policy_document_id: activeDoc.id,
        doc_type: activeDoc.doc_type,
        version: activeDoc.version,
        role_at_acceptance: ctx.role,
        workflow_key: workflowKey,
        ip,
        user_agent: userAgent,
      });

      if (error) {
        logger.error("policies.accept.insert_error", { policy_id: policyId, error: error.message });
        throw new Error(error.message);
      }

      inserted.push({
        id: activeDoc.id,
        doc_type: activeDoc.doc_type,
        version: activeDoc.version,
      });

      await logEvent({
        ctx,
        action: "policy.accept",
        resourceType: "policy_document",
        resourceId: activeDoc.id,
        metadata: {
          doc_type: activeDoc.doc_type,
          version: activeDoc.version,
          workflow_key: workflowKey,
          applies_to_role: activeDoc.applies_to_role,
        },
        req,
      });
    }

    return apiOk({ accepted: inserted });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("policies.accept.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
