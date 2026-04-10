/**
 * POST /api/legal/consent/step — Record signup legal consent step.
 *
 * Thin handler: validate → delegate to consentStepService → return result.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFail, apiFailFromError, apiOk, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  processConsentStep,
  type ConsentStep,
} from "@/lib/server/policies/consentStepService";

function parseInet(ip: string | null): string | null {
  if (!ip?.trim()) return null;
  const trimmed = ip.trim();
  if (trimmed.length > 45) return null;
  return trimmed;
}

function clientIp(req: Request): string | null {
  return (
    parseInet(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null) ??
    parseInet(req.headers.get("x-real-ip")) ??
    null
  );
}

const VALID_STEPS = new Set<string>(["terms", "privacy", "waiver", "beta"]);

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 422);
    }

    const step = (body as { step?: string }).step;
    if (!step || !VALID_STEPS.has(step)) {
      return apiFail("VALIDATION_ERROR", "Invalid consent step.", undefined, 422);
    }

    const result = await processConsentStep({
      step: step as ConsentStep,
      userId: ctx.userId,
      role: ctx.role,
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent") ?? null,
      body: body as Record<string, unknown>,
    });

    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("legal.consent.step.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
