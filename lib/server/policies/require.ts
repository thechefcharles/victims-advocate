/**
 * Phase 4: Require accepted policies or throw CONSENT_REQUIRED.
 */

import { AppError } from "@/lib/server/api";
import type { AuthContext } from "@/lib/server/auth";
import { getMissingAcceptances } from "./lookup";
import type { PolicyDocumentRow } from "./types";
import { logEvent } from "@/lib/server/audit/logEvent";

export type RequireAcceptedPoliciesParams = {
  ctx: AuthContext;
  requiredDocs: { docType: "terms_of_use" | "privacy_policy" | "ai_disclaimer" | "non_legal_advice"; workflowKey?: string | null }[];
  req?: Request | null;
};

/**
 * If any required policy is not accepted, logs policy.blocked and throws AppError with code CONSENT_REQUIRED.
 * details: { missing: Array<{ doc_type, version, id, title }> }
 */
export async function requireAcceptedPolicies(params: RequireAcceptedPoliciesParams): Promise<void> {
  const { ctx, requiredDocs, req } = params;
  const missing: PolicyDocumentRow[] = [];

  for (const spec of requiredDocs) {
    const { getActivePolicyDocument, hasAcceptedActivePolicy } = await import("./lookup");
    const policy = await getActivePolicyDocument({
      docType: spec.docType,
      role: ctx.role,
      workflowKey: spec.workflowKey ?? null,
    });
    if (!policy) continue;

    const accepted = await hasAcceptedActivePolicy({
      userId: ctx.userId,
      docType: spec.docType,
      role: ctx.role,
      workflowKey: spec.workflowKey ?? null,
    });
    if (!accepted) missing.push(policy);
  }

  if (missing.length > 0) {
    await logEvent({
      ctx,
      action: "policy.blocked",
      resourceType: "policy_acceptance",
      metadata: {
        doc_types: missing.map((m) => m.doc_type),
        versions: missing.map((m) => m.version),
        workflow_keys: missing.map((m) => m.workflow_key),
      },
      req,
    });

    throw new AppError(
      "CONSENT_REQUIRED",
      "Accept the policies below to continue. They explain how we handle your information and this application.",
      {
        missing: missing.map((m) => ({
          doc_type: m.doc_type,
          version: m.version,
          id: m.id,
          title: m.title,
          workflow_key: m.workflow_key,
        })),
      },
      403
    );
  }
}
