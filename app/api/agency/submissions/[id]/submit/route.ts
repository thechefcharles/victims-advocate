/**
 * POST /api/agency/submissions/[id]/submit — submit a draft or resubmit after revision
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { submitReportingSubmission } from "@/lib/server/agency/reportingSubmissionService";
import { serializeSubmissionForProvider } from "@/lib/server/agency/agencySerializer";
import { getSubmissionById } from "@/lib/server/agency/agencyRepository";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: Request, ctxParams: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await ctxParams.params;

    const supabase = getSupabaseAdmin();
    const sub = await getSubmissionById(id, supabase);
    if (!sub) return apiFail("NOT_FOUND", "Submission not found.", undefined, 404);

    const actor = buildActor(ctx);
    const decision = await can("reporting_submission:submit", actor, {
      type: "reporting_submission", id, tenantId: sub.organizationId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const updated = await submitReportingSubmission({
      submissionId: id, submittedByUserId: ctx.userId, supabase,
    });
    return apiOk({ submission: serializeSubmissionForProvider(updated) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") logger.error("agency.submit.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
