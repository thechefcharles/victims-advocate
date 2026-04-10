/**
 * GET  /api/governance/policies       — list policy documents
 * POST /api/governance/policies       — create draft (admin only)
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createPolicyDraft, listPolicies } from "@/lib/server/governance/policyDocumentService";
import { serializePolicyForPublic, serializePolicyForAdmin } from "@/lib/server/governance/governanceSerializer";
import { z } from "zod";

const createBody = z.object({
  policy_type: z.string().min(1),
  version: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const actor = buildActor(ctx);
    const decision = await can("policy_document:view", actor, { type: "policy_document", id: null });
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);

    const url = new URL(req.url);
    const policyType = url.searchParams.get("type") ?? null;
    const docs = await listPolicies(policyType);
    const serialized = ctx.isAdmin ? docs.map(serializePolicyForAdmin) : docs.map(serializePolicyForPublic);
    return apiOk({ policies: serialized });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") logger.error("governance.policies.list.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const actor = buildActor(ctx);
    const decision = await can("policy_document:create", actor, { type: "policy_document", id: null });
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);

    const parsed = createBody.safeParse(await req.json());
    if (!parsed.success) return apiFail("VALIDATION_ERROR", "Invalid input.", parsed.error.flatten(), 422);

    const doc = await createPolicyDraft({
      policyType: parsed.data.policy_type,
      version: parsed.data.version,
      title: parsed.data.title,
      content: parsed.data.content,
      createdByUserId: ctx.userId,
    });
    return apiOk({ policy: serializePolicyForAdmin(doc) }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") logger.error("governance.policies.create.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
