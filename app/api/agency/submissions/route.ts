/**
 * Domain 6.2 — Reporting submissions list + create.
 *
 * GET  /api/agency/submissions            — list (provider: own org, agency: in-scope)
 * POST /api/agency/submissions            — create draft (provider leadership)
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createReportingSubmissionDraft } from "@/lib/server/agency/reportingSubmissionService";
import { listSubmissionsForOrg, listSubmissionsForAgency } from "@/lib/server/agency/agencyRepository";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveAgencyScope } from "@/lib/server/agency/agencyScopeService";
import {
  serializeSubmissionForProvider,
  serializeSubmissionForAgency,
  serializeSubmissionForAdmin,
} from "@/lib/server/agency/agencySerializer";
import { z } from "zod";

const createBody = z.object({
  organization_id: z.string().uuid(),
  agency_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  reporting_period_start: z.string(),
  reporting_period_end: z.string(),
  submission_data: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("reporting_submission:view", actor, {
      type: "reporting_submission",
      id: null,
      tenantId: ctx.orgId,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    if (ctx.accountType === "provider" && ctx.orgId) {
      const subs = await listSubmissionsForOrg(ctx.orgId, getSupabaseAdmin());
      return apiOk({
        submissions: subs.map(serializeSubmissionForProvider),
      });
    }

    if (ctx.accountType === "agency") {
      const scope = await resolveAgencyScope(actor);
      if (!scope) {
        return apiFail("FORBIDDEN", "No agency scope found.", undefined, 403);
      }
      const subs = await listSubmissionsForAgency(scope.agencyId, getSupabaseAdmin());
      return apiOk({
        submissions: subs.map(serializeSubmissionForAgency),
      });
    }

    if (ctx.isAdmin) {
      return apiOk({ submissions: [] });
    }

    return apiFail("FORBIDDEN", "Account type not permitted.", undefined, 403);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("agency.submissions.list.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json();
    const parsed = createBody.safeParse(body);
    if (!parsed.success) {
      return apiFail("VALIDATION_ERROR", "Invalid submission input.", parsed.error.flatten(), 422);
    }

    const actor = buildActor(ctx);
    const decision = await can("reporting_submission:create", actor, {
      type: "reporting_submission",
      id: null,
      tenantId: parsed.data.organization_id,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const sub = await createReportingSubmissionDraft({
      organizationId: parsed.data.organization_id,
      agencyId: parsed.data.agency_id,
      submittedByUserId: ctx.userId,
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      reportingPeriodStart: parsed.data.reporting_period_start,
      reportingPeriodEnd: parsed.data.reporting_period_end,
      submissionData: parsed.data.submission_data,
    });
    return apiOk(
      { submission: ctx.isAdmin ? serializeSubmissionForAdmin(sub) : serializeSubmissionForProvider(sub) },
      undefined,
      201,
    );
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("agency.submissions.create.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
