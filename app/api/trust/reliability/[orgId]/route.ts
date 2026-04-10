/**
 * Domain 6.1 — Reliability summary endpoint.
 *
 * GET /api/trust/reliability/[orgId]
 *   Returns the applicant-safe reliability summary for an org.
 *   Account-type-aware serializer dispatch:
 *     applicant/provider → applicant-safe view
 *     agency             → comparative view (composite included)
 *     admin              → admin full view
 *     anonymous → 401
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getProviderReliabilitySummary } from "@/lib/server/trust/providerReliabilityService";
import { getLatestSnapshotForOrg } from "@/lib/server/trust/trustRepository";
import {
  serializeForApplicant,
  serializeForAgency,
  serializeForPublic,
} from "@/lib/server/trust/trustSerializer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

export async function GET(req: Request, ctxParams: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { orgId } = await ctxParams.params;
    if (!orgId) {
      return apiFail("VALIDATION_ERROR", "Missing orgId.", undefined, 400);
    }

    const actor = buildActor(ctx);
    const decision = await can("provider_reliability:view_applicant_safe", actor, {
      type: "trust",
      id: orgId,
      tenantId: orgId,
    });
    if (!decision.allowed) {
      // Try the public view as a fallback for permitted but lower-privilege actors.
      const publicDecision = await can(
        "provider_reliability:view_public",
        actor,
        { type: "trust", id: orgId, tenantId: orgId },
      );
      if (!publicDecision.allowed) {
        return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
      }
    }

    const supabase = getSupabaseAdmin();
    const summary = await getProviderReliabilitySummary(orgId, supabase);
    if (!summary) {
      return apiOk({ reliability: null });
    }

    if (ctx.accountType === "agency") {
      const snapshot = await getLatestSnapshotForOrg(orgId, supabase);
      if (snapshot) {
        return apiOk({ reliability: serializeForAgency({ snapshot, summary }) });
      }
      return apiOk({ reliability: serializeForPublic(summary) });
    }
    if (
      ctx.accountType === "applicant" ||
      ctx.accountType === "provider" ||
      ctx.isAdmin
    ) {
      return apiOk({ reliability: serializeForApplicant(summary) });
    }
    return apiOk({ reliability: serializeForPublic(summary) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("trust.reliability.get.error", {
        code: appErr.code,
        message: appErr.message,
      });
    }
    return apiFailFromError(appErr);
  }
}
