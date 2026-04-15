/**
 * POST /api/intake-v2/sessions/[id]/submit — finalize an intake-v2 session.
 *
 * Phase D: transitions status to 'submitted' and emits the intake.completed
 * audit event. Phase E will adapt answers into the legacy intake schema and
 * call intakeService.submitIntake against a paired intake_sessions row.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { submitIntakeV2Session } from "@/lib/server/intakeV2/intakeV2Service";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;
    if (!id) return apiFail("VALIDATION_ERROR", "Missing session id.");
    const submitted = await submitIntakeV2Session(ctx, id);
    return apiOk({
      sessionId: submitted.id,
      status: submitted.status,
      submittedAt: submitted.submitted_at,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("intake_v2.sessions.submit.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
