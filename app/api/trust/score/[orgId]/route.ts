/**
 * Domain 6.1 — Score endpoints.
 *
 * GET  /api/trust/score/[orgId]      — provider internal score view (own org)
 * POST /api/trust/score/[orgId]      — recalculate score (provider leadership / admin)
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getLatestSnapshotForOrg } from "@/lib/server/trust/trustRepository";
import { recalculateProviderScore } from "@/lib/server/trust/providerScoreService";
import { serializeForProvider } from "@/lib/server/trust/trustSerializer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

export async function GET(req: Request, ctxParams: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { orgId } = await ctxParams.params;
    const actor = buildActor(ctx);

    const decision = await can("provider_score:view_internal", actor, {
      type: "trust",
      id: orgId,
      tenantId: orgId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const snapshot = await getLatestSnapshotForOrg(orgId, getSupabaseAdmin());
    if (!snapshot) return apiOk({ score: null });
    return apiOk({ score: serializeForProvider(snapshot) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("trust.score.get.error", {
        code: appErr.code,
        message: appErr.message,
      });
    }
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request, ctxParams: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { orgId } = await ctxParams.params;
    const actor = buildActor(ctx);

    const decision = await can("provider_score:recalculate", actor, {
      type: "trust",
      id: orgId,
      tenantId: orgId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const result = await recalculateProviderScore({ organizationId: orgId });
    return apiOk(
      {
        score: serializeForProvider(result.snapshot),
        reliability_tier: result.summary.reliabilityTier,
      },
      undefined,
      201,
    );
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("trust.score.post.error", {
        code: appErr.code,
        message: appErr.message,
      });
    }
    return apiFailFromError(appErr);
  }
}
