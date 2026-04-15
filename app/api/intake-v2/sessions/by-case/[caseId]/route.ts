/**
 * GET /api/intake-v2/sessions/by-case/[caseId]
 *
 * Returns the most recent draft intake-v2 session that belongs to the
 * current user and points at the given legacy cases.id, or 404 when none
 * exists. Used by the page bootstrap when a URL carries ?caseId= but no
 * ?sessionId= — if 404, the client follows up with a POST to create a new
 * session linked to that case.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  findDraftSessionForCase,
  type IntakeV2Session,
} from "@/lib/server/intakeV2/intakeV2Service";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ caseId: string }>;
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
    const { caseId } = await context.params;
    if (!caseId) return apiFail("VALIDATION_ERROR", "Missing caseId.");
    const session = await findDraftSessionForCase(ctx, caseId);
    if (!session) return apiFail("NOT_FOUND", "No draft session for case.", undefined, 404);
    return apiOk(toView(session));
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("intake_v2.sessions.by_case.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
