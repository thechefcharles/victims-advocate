/**
 * Domain 6.1 — Provider affiliation endpoints.
 *
 * GET  /api/trust/affiliation/[orgId]   — view current affiliation
 * POST /api/trust/affiliation/[orgId]   — admin: transition affiliation state
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  getProviderAffiliationStatus,
  updateProviderAffiliation,
} from "@/lib/server/trust/providerAffiliationService";
import {
  serializeAffiliationForAdmin,
  serializeAffiliationForProvider,
} from "@/lib/server/trust/trustSerializer";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

const transitionBody = z.object({
  status: z.enum(["pending_review", "affiliated", "not_affiliated", "suspended"]),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request, ctxParams: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { orgId } = await ctxParams.params;
    const actor = buildActor(ctx);
    const decision = await can("provider_affiliation:view", actor, {
      type: "trust",
      id: orgId,
      tenantId: orgId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const affiliation = await getProviderAffiliationStatus(orgId);
    if (!affiliation) return apiOk({ affiliation: null });

    return apiOk({
      affiliation: ctx.isAdmin
        ? serializeAffiliationForAdmin(affiliation)
        : serializeAffiliationForProvider(affiliation),
    });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("trust.affiliation.get.error", {
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
    const decision = await can("provider_affiliation:manage", actor, {
      type: "trust",
      id: orgId,
      tenantId: orgId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const body = await req.json();
    const parsed = transitionBody.safeParse(body);
    if (!parsed.success) {
      return apiFail(
        "VALIDATION_ERROR",
        "Invalid affiliation input.",
        parsed.error.flatten(),
        422,
      );
    }

    const updated = await updateProviderAffiliation({
      organizationId: orgId,
      toStatus: parsed.data.status,
      reason: parsed.data.reason,
      notes: parsed.data.notes,
      setByUserId: ctx.userId,
    });
    return apiOk({ affiliation: serializeAffiliationForAdmin(updated) }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("trust.affiliation.post.error", {
        code: appErr.code,
        message: appErr.message,
      });
    }
    return apiFailFromError(appErr);
  }
}
