/**
 * Phase 4: Get active policies relevant to current user/role/workflow.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { getActivePolicyDocument, getMissingAcceptances } from "@/lib/server/policies";
import { logger } from "@/lib/server/logging";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { searchParams } = new URL(req.url);
    const workflowKey = searchParams.get("workflow_key")?.trim() || null;

    const terms = await getActivePolicyDocument({
      docType: "terms_of_use",
      role: ctx.role,
      workflowKey: null,
    });
    const privacy = await getActivePolicyDocument({
      docType: "privacy_policy",
      role: ctx.role,
      workflowKey: null,
    });
    const aiDisclaimer = await getActivePolicyDocument({
      docType: "ai_disclaimer",
      role: ctx.role,
      workflowKey: workflowKey ?? null,
    });
    const nonLegalAdvice = await getActivePolicyDocument({
      docType: "non_legal_advice",
      role: ctx.role,
      workflowKey: workflowKey ?? "compensation_intake",
    });

    const missing = await getMissingAcceptances({
      userId: ctx.userId,
      role: ctx.role,
      workflowKey,
    });

    const policies = [terms, privacy, aiDisclaimer, nonLegalAdvice].filter(
      (p): p is NonNullable<typeof p> => p != null
    );

    return apiOk({
      policies: policies.map((p) => ({
        id: p.id,
        doc_type: p.doc_type,
        version: p.version,
        title: p.title,
        content: p.content,
        workflow_key: p.workflow_key,
        applies_to_role: p.applies_to_role,
      })),
      missing_doc_types: missing.map((m) => m.doc_type),
      missing_details: missing.map((m) => ({
        id: m.id,
        doc_type: m.doc_type,
        version: m.version,
        title: m.title,
        content: m.content,
        workflow_key: m.workflow_key,
      })),
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("policies.active.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
