/**
 * Domain 5.2 — Recommendations API.
 *
 * GET  /api/recommendations          — view most recent set (generated on demand in v1)
 * POST /api/recommendations/refresh  — force regeneration (handled below via ?refresh=1)
 *
 * v1 ships without a cache layer, so GET and refresh both delegate to
 * generateRecommendations(). Serializer is chosen by account type.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { generateRecommendations } from "@/lib/server/recommendations/recommendationService";
import {
  serializeForApplicant,
  serializeForProvider,
  serializeForAdmin,
} from "@/lib/server/recommendations/recommendationSerializer";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const url = new URL(req.url);
    const refresh = url.searchParams.get("refresh") === "1";

    const action = refresh ? "recommendation:refresh" : "recommendation:view";
    const decision = await can(action, actor, {
      type: "recommendation",
      id: null,
      ownerId: actor.userId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const set = await generateRecommendations({ actor });

    if (ctx.isAdmin) {
      return apiOk({ recommendations: serializeForAdmin(set) });
    }
    if (ctx.accountType === "applicant") {
      return apiOk({ recommendations: serializeForApplicant(set) });
    }
    if (ctx.accountType === "provider") {
      return apiOk({ recommendations: serializeForProvider(set) });
    }
    return apiFail("FORBIDDEN", "Account type not permitted.", undefined, 403);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("recommendations.get.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("recommendation:generate", actor, {
      type: "recommendation",
      id: null,
      ownerId: actor.userId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const set = await generateRecommendations({ actor });

    if (ctx.isAdmin) {
      return apiOk({ recommendations: serializeForAdmin(set) }, undefined, 201);
    }
    if (ctx.accountType === "applicant") {
      return apiOk({ recommendations: serializeForApplicant(set) }, undefined, 201);
    }
    if (ctx.accountType === "provider") {
      return apiOk({ recommendations: serializeForProvider(set) }, undefined, 201);
    }
    return apiFail("FORBIDDEN", "Account type not permitted.", undefined, 403);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("recommendations.post.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
