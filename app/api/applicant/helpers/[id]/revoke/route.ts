import { getAuthContext, requireAuth } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  getTrustedHelperAccess,
  revokeTrustedHelperAccess,
} from "@/lib/server/trustedHelper/trustedHelperService";
import { serializeForApplicant } from "@/lib/server/trustedHelper/trustedHelperSerializer";
import { z } from "zod";

interface RouteParams { params: Promise<{ id: string }> }

const revokeBodySchema = z.object({
  reason: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireAuth(ctx);

    const { id } = await context.params;
    const existing = await getTrustedHelperAccess({ ctx, id });

    const actor = buildActor(ctx);
    const decision = await can("trusted_helper:revoke", actor, {
      type: "trusted_helper",
      id,
      ownerId: existing.applicant_user_id,
      status: existing.status,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = revokeBodySchema.safeParse(body);
    const reason = parsed.success ? parsed.data.reason : null;

    const revoked = await revokeTrustedHelperAccess({ ctx, id, reason });
    return apiOk({ grant: serializeForApplicant(revoked) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("applicant.helpers.revoke.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
