/**
 * Domain 6.1 — POST /api/trust/methodology/[id]/publish
 *
 * Publish a draft methodology. Demotes the prior active row to deprecated
 * atomically (single-active enforced at DB level). Admin only.
 *
 * **Note**: this is a POST action endpoint, not a PATCH on the methodology
 * row, per the architecture rule "use POST for methodology publish".
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { publishScoreMethodology } from "@/lib/server/trust/scoreMethodologyService";
import { serializeMethodology } from "@/lib/server/trust/trustSerializer";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctxParams: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("score_methodology:publish", actor, {
      type: "trust",
      id: null,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const { id } = await ctxParams.params;
    const methodology = await publishScoreMethodology({ id });
    return apiOk({ methodology: serializeMethodology(methodology) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("trust.methodology.publish.error", {
        code: appErr.code,
        message: appErr.message,
      });
    }
    return apiFailFromError(appErr);
  }
}
