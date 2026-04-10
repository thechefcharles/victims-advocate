/**
 * POST /api/governance/policies/[id]/publish — publish a draft policy (admin only)
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { publishPolicyDocument } from "@/lib/server/governance/policyDocumentService";
import { serializePolicyForAdmin } from "@/lib/server/governance/governanceSerializer";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: Request, ctxParams: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const actor = buildActor(ctx);
    const decision = await can("policy_document:publish", actor, { type: "policy_document", id: null });
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);

    const { id } = await ctxParams.params;
    const doc = await publishPolicyDocument({ id, actorId: ctx.userId });
    return apiOk({ policy: serializePolicyForAdmin(doc) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") logger.error("governance.policies.publish.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
