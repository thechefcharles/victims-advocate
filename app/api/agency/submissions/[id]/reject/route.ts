/**
 * POST /api/agency/submissions/[id]/reject — reject submission (agency officer/owner ONLY)
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { rejectReportingSubmission } from "@/lib/server/agency/reportingSubmissionService";
import { serializeSubmissionForAgency } from "@/lib/server/agency/agencySerializer";
import { getSubmissionById } from "@/lib/server/agency/agencyRepository";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

interface RouteParams { params: Promise<{ id: string }> }

const body = z.object({ reason: z.string().min(1) });

export async function POST(req: Request, ctxParams: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await ctxParams.params;

    const parsed = body.safeParse(await req.json());
    if (!parsed.success) return apiFail("VALIDATION_ERROR", "Reason is required.", parsed.error.flatten(), 422);

    const supabase = getSupabaseAdmin();
    const sub = await getSubmissionById(id, supabase);
    if (!sub) return apiFail("NOT_FOUND", "Submission not found.", undefined, 404);

    const actor = buildActor(ctx);
    const decision = await can("reporting_submission:reject", actor, {
      type: "reporting_submission", id, tenantId: sub.organizationId,
    });
    if (!decision.allowed) return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);

    const updated = await rejectReportingSubmission({
      submissionId: id, reviewerUserId: ctx.userId, reason: parsed.data.reason, supabase,
    });
    return apiOk({ submission: serializeSubmissionForAgency(updated) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") logger.error("agency.reject.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
