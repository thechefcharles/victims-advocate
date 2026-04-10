/**
 * POST /api/governance/accept — accept a required policy (any authenticated user)
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { acceptPolicy } from "@/lib/server/governance/policyAcceptanceService";
import { serializePolicyAcceptance } from "@/lib/server/governance/governanceSerializer";
import { z } from "zod";

const body = z.object({ policy_type: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const actor = buildActor(ctx);
    const decision = await can("policy_acceptance:create", actor, { type: "policy_acceptance", id: null });
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);

    const parsed = body.safeParse(await req.json());
    if (!parsed.success) return apiFail("VALIDATION_ERROR", "policy_type required.", parsed.error.flatten(), 422);

    const acceptance = await acceptPolicy({ userId: ctx.userId, policyType: parsed.data.policy_type });
    return apiOk({ acceptance: serializePolicyAcceptance(acceptance) }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") logger.error("governance.accept.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
