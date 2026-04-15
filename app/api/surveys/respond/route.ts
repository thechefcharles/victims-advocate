/**
 * Anonymous Victim Experience Survey — response endpoint.
 *
 * POST /api/surveys/respond
 * Body: { token, responses: { feltHeard, advocateClarity, feltSafe,
 *         rightsExplained, likelihoodToRecommend } }
 *
 * The token IS the auth. No session required and no actor identity is looked
 * up — the service explicitly does not record who submitted the response.
 * The response body on success is { ok: true } with no identifying data.
 */

import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { submitSurveyResponse } from "@/lib/server/surveys";

interface Body {
  token?: unknown;
  responses?: {
    feltHeard?: unknown;
    advocateClarity?: unknown;
    feltSafe?: unknown;
    rightsExplained?: unknown;
    likelihoodToRecommend?: unknown;
  };
}

function toInt(v: unknown): number {
  const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
  return Number.isInteger(n) ? n : NaN;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body || typeof body.token !== "string" || !body.responses) {
      return apiFail("VALIDATION_ERROR", "token and responses are required");
    }

    const r = body.responses;
    await submitSurveyResponse(body.token, {
      feltHeard: toInt(r.feltHeard),
      advocateClarity: toInt(r.advocateClarity),
      feltSafe: toInt(r.feltSafe),
      rightsExplained: toInt(r.rightsExplained),
      likelihoodToRecommend: toInt(r.likelihoodToRecommend),
    });

    return apiOk({ ok: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("surveys.respond.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
