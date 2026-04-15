/**
 * GET  /api/intake-v2/sessions/[id] — current draft state.
 * PATCH /api/intake-v2/sessions/[id] — merge answers / completedSections /
 *   currentSection. Owner-only (admin override allowed for support).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  getIntakeV2Session,
  patchIntakeV2Session,
  type IntakeV2Session,
} from "@/lib/server/intakeV2/intakeV2Service";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function toView(s: IntakeV2Session) {
  return {
    sessionId: s.id,
    templateId: s.template_id,
    stateCode: s.state_code,
    filerType: s.filer_type,
    answers: s.answers,
    answersLocale: s.answers_locale,
    signedAt: s.signed_at,
    caseId: s.case_id,
    completedSections: s.completed_sections,
    currentSection: s.current_section,
    status: s.status,
    submittedAt: s.submitted_at,
  };
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;
    if (!id) return apiFail("VALIDATION_ERROR", "Missing session id.");
    const session = await getIntakeV2Session(ctx, id);
    return apiOk(toView(session));
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("intake_v2.sessions.get.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}

export async function PATCH(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;
    if (!id) return apiFail("VALIDATION_ERROR", "Missing session id.");
    const body = (await req.json().catch(() => ({}))) as {
      answers?: Record<string, unknown>;
      completedSections?: string[];
      currentSection?: string | null;
    };
    const updated = await patchIntakeV2Session(ctx, id, {
      answers: body.answers,
      completedSections: body.completedSections,
      currentSection: body.currentSection,
    });
    return apiOk(toView(updated));
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("intake_v2.sessions.patch.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
