/**
 * Domain 6.1 — Signal disputes (provider-facing).
 *
 * POST /api/disputes/signals   — submit a dispute for a trust signal
 * GET  /api/disputes/signals   — list own org's disputes (cursor paginated)
 */

import type { AuthContext } from "@/lib/server/auth/context";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  submitDispute,
  listDisputesForOrg,
  serializeForProvider,
  type DisputeActor,
} from "@/lib/server/trust/signalDisputeService";

function toActor(ctx: AuthContext): DisputeActor {
  return {
    userId: ctx.userId,
    accountType: ctx.accountType,
    organizationId: ctx.orgId ?? null,
    isAdmin: Boolean(ctx.isAdmin),
  };
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (ctx.accountType !== "provider" && !ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Only provider organizations may file disputes.", undefined, 403);
    }

    const body = (await req.json().catch(() => null)) as {
      signalEventId?: unknown;
      explanation?: unknown;
      evidenceUrls?: unknown;
    } | null;
    if (!body) return apiFail("VALIDATION_ERROR", "Body is required.");

    const dispute = await submitDispute(
      toActor(ctx),
      {
        signalEventId: String(body.signalEventId ?? ""),
        explanation: String(body.explanation ?? ""),
        evidenceUrls: Array.isArray(body.evidenceUrls)
          ? (body.evidenceUrls as unknown[]).filter((u): u is string => typeof u === "string")
          : undefined,
      },
    );

    return apiOk(serializeForProvider(dispute), undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("disputes.signals.post.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "25", 10);

    const orgId = ctx.orgId;
    if (!orgId) return apiFail("FORBIDDEN", "No organization context.", undefined, 403);

    const result = await listDisputesForOrg(toActor(ctx), orgId, { cursor, limit });
    return apiOk(
      { disputes: result.disputes },
      { nextCursor: result.nextCursor, limit },
    );
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("disputes.signals.get.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
