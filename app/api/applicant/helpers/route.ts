/**
 * Domain 5.1 — GET/POST /api/applicant/helpers
 * List or grant trusted helper access for the authenticated applicant.
 * Thin route — all logic in lib/server/trustedHelper/trustedHelperService.
 */

import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  createTrustedHelperAccess,
  listMyTrustedHelperGrants,
} from "@/lib/server/trustedHelper/trustedHelperService";
import { serializeForApplicant } from "@/lib/server/trustedHelper/trustedHelperSerializer";
import type { HelperGrantedScope, HelperRelationshipType } from "@/lib/server/trustedHelper/trustedHelperTypes";
import { HELPER_RELATIONSHIP_TYPES } from "@/lib/server/trustedHelper/trustedHelperTypes";
import { z } from "zod";

const grantedScopeSchema = z.object({
  allowedActions: z.array(z.string()).default([]),
  allowedDomains: z.array(z.string()).default([]),
  caseRestriction: z.string().optional(),
  viewOnly: z.boolean().optional(),
});

const createGrantBodySchema = z.object({
  helperUserId: z.string().uuid(),
  relationshipType: z.enum(HELPER_RELATIONSHIP_TYPES).nullable().optional(),
  grantedScope: grantedScopeSchema,
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    const actor = buildActor(ctx);
    const decision = await can("trusted_helper:list", actor, {
      type: "trusted_helper",
      id: null,
      ownerId: ctx.userId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const grants = await listMyTrustedHelperGrants({ ctx });
    return apiOk({ helpers: grants.map(serializeForApplicant) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("applicant.helpers.get.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request.", undefined, 422);
    }

    const parsed = createGrantBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiFail("VALIDATION_ERROR", "Invalid helper grant input.", parsed.error.flatten(), 422);
    }

    const actor = buildActor(ctx);
    const decision = await can("trusted_helper:grant", actor, {
      type: "trusted_helper",
      id: null,
      ownerId: ctx.userId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const scope: HelperGrantedScope = {
      allowedActions: parsed.data.grantedScope.allowedActions,
      allowedDomains: parsed.data.grantedScope.allowedDomains,
      ...(parsed.data.grantedScope.caseRestriction
        ? { caseRestriction: parsed.data.grantedScope.caseRestriction }
        : {}),
      ...(parsed.data.grantedScope.viewOnly !== undefined
        ? { viewOnly: parsed.data.grantedScope.viewOnly }
        : {}),
    };

    const grant = await createTrustedHelperAccess({
      ctx,
      input: {
        applicant_user_id: ctx.userId,
        helper_user_id: parsed.data.helperUserId,
        relationship_type: (parsed.data.relationshipType as HelperRelationshipType | null) ?? null,
        granted_scope_detail: scope,
        expires_at: parsed.data.expiresAt ?? null,
        notes: parsed.data.notes ?? null,
      },
    });

    return apiOk({ grant: serializeForApplicant(grant) }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("applicant.helpers.post.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
