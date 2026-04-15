/**
 * POST /api/intake-v2/sessions — create a new template-driven intake session.
 *   Body: { stateCode, filerType }
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createIntakeV2Session } from "@/lib/server/intakeV2/intakeV2Service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const body = (await req.json().catch(() => ({}))) as {
      stateCode?: string;
      filerType?: string;
      answersLocale?: "en" | "es";
      caseId?: string | null;
    };
    if (!body.stateCode || !body.filerType) {
      return apiFail("VALIDATION_ERROR", "stateCode and filerType required.");
    }
    const session = await createIntakeV2Session(ctx, {
      stateCode: body.stateCode,
      filerType: body.filerType,
      answersLocale: body.answersLocale,
      caseId: body.caseId ?? null,
    });
    return apiOk({
      sessionId: session.id,
      templateId: session.template_id,
      stateCode: session.state_code,
      filerType: session.filer_type,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("intake_v2.sessions.create.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
