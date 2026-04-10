/**
 * Domain 6.1 — POST /api/trust/disputes
 *
 * Create a dispute against a score snapshot. Provider leadership only;
 * snapshot must belong to the actor's org.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createScoreDispute } from "@/lib/server/trust/scoreDisputeService";
import { serializeDisputeForProvider } from "@/lib/server/trust/trustSerializer";
import { z } from "zod";

const createBody = z.object({
  organization_id: z.string().uuid(),
  snapshot_id: z.string().uuid(),
  reason: z.string().min(1),
  evidence: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json();
    const parsed = createBody.safeParse(body);
    if (!parsed.success) {
      return apiFail(
        "VALIDATION_ERROR",
        "Invalid dispute input.",
        parsed.error.flatten(),
        422,
      );
    }

    const actor = buildActor(ctx);
    const decision = await can("provider_score:dispute.create", actor, {
      type: "trust",
      id: null,
      tenantId: parsed.data.organization_id,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const dispute = await createScoreDispute({
      organizationId: parsed.data.organization_id,
      snapshotId: parsed.data.snapshot_id,
      reason: parsed.data.reason,
      evidence: parsed.data.evidence ?? {},
      openedByUserId: ctx.userId,
    });
    return apiOk({ dispute: serializeDisputeForProvider(dispute) }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("trust.disputes.create.error", {
        code: appErr.code,
        message: appErr.message,
      });
    }
    return apiFailFromError(appErr);
  }
}
