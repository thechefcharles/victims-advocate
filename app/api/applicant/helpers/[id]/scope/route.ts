import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  getTrustedHelperAccess,
  updateTrustedHelperScope,
} from "@/lib/server/trustedHelper/trustedHelperService";
import { serializeForApplicant } from "@/lib/server/trustedHelper/trustedHelperSerializer";
import type { HelperGrantedScope } from "@/lib/server/trustedHelper/trustedHelperTypes";
import { z } from "zod";

interface RouteParams { params: Promise<{ id: string }> }

const scopeBodySchema = z.object({
  grantedScope: z.object({
    allowedActions: z.array(z.string()),
    allowedDomains: z.array(z.string()),
    caseRestriction: z.string().optional(),
    viewOnly: z.boolean().optional(),
  }),
});

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    const { id } = await context.params;
    const existing = await getTrustedHelperAccess({ ctx, id });

    const actor = buildActor(ctx);
    const decision = await can("trusted_helper:scope.update", actor, {
      type: "trusted_helper",
      id,
      ownerId: existing.applicant_user_id,
      status: existing.status,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const body = await req.json();
    const parsed = scopeBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiFail("VALIDATION_ERROR", "Invalid scope update input.", parsed.error.flatten(), 422);
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

    const updated = await updateTrustedHelperScope({
      ctx,
      id,
      input: { granted_scope_detail: scope },
    });
    return apiOk({ grant: serializeForApplicant(updated) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("applicant.helpers.scope.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
