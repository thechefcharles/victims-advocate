/**
 * POST /api/advocate-connections/request — Applicant requests advocate connection for a case.
 */

import { getAuthContext, requireFullAccess, requireRole } from "@/lib/server/auth";
import { apiOk, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createAdvocateConnectionRequest } from "@/lib/server/advocate/advocateConnectionService";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    requireRole(ctx, "victim");

    const body = await req.json().catch(() => ({}));
    const advocateEmail = String(body?.advocate_email ?? "").trim().toLowerCase();
    const caseId = body?.case_id != null ? String(body.case_id).trim() : "";

    const result = await createAdvocateConnectionRequest(ctx, { advocateEmail, caseId }, req);
    return apiOk(result);
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("advocate_connection.request.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
