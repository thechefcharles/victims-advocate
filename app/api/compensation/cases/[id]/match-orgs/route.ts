/**
 * Phase B: Organization matching for a case (GET latest run, POST run + persist).
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { getCaseById, appendCaseTimelineEvent } from "@/lib/server/data";
import {
  runCaseOrganizationMatching,
  persistOrganizationMatchRun,
  getLatestOrganizationMatchesForCase,
} from "@/lib/server/matching/service";
import { matchRunRowToApi } from "@/lib/server/matching/apiPayload";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;
    if (!id) {
      return apiFail("VALIDATION_ERROR", "Missing case id", undefined, 400);
    }

    const data = await getLatestOrganizationMatchesForCase({ caseId: id, ctx });
    if (data === null) {
      return apiFail("FORBIDDEN", "Access denied", undefined, 403);
    }

    return apiOk({
      run_group_id: data.run_group_id,
      created_at: data.created_at,
      matches: data.matches.map((m) => matchRunRowToApi(m)),
      global_flags: data.global_flags,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.match-orgs.get.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;
    if (!id) {
      return apiFail("VALIDATION_ERROR", "Missing case id", undefined, 400);
    }

    const caseResult = await getCaseById({ caseId: id, ctx });
    if (!caseResult) {
      return apiFail("FORBIDDEN", "Access denied", undefined, 403);
    }
    if (!caseResult.access.can_edit && caseResult.access.role === "owner") {
      return apiFail(
        "FORBIDDEN",
        "Only advocates or admins can run organization matching",
        undefined,
        403
      );
    }
    if (!caseResult.access.can_edit && !ctx.isAdmin) {
      return apiFail("FORBIDDEN", "Edit access required to run matching", undefined, 403);
    }

    const scopeOrgId = caseResult.case.organization_id as string;
    if (!scopeOrgId) {
      return apiFail("INTERNAL", "Case organization missing", undefined, 500);
    }

    await logEvent({
      ctx,
      action: "matching.run_started",
      resourceType: "case",
      resourceId: id,
      organizationId: scopeOrgId,
      metadata: {
        case_id: id,
        services_needed_summary: (caseResult.case as any).application
          ? "from_application"
          : "minimal",
      },
      req,
    }).catch(() => {});

    let runResult;
    try {
      runResult = await runCaseOrganizationMatching({ caseId: id, ctx });
      await persistOrganizationMatchRun({
        caseId: id,
        scopeOrganizationId: scopeOrgId,
        runGroupId: runResult.run_group_id,
        actorUserId: ctx.userId,
        input: runResult.input,
        matches: runResult.matches,
        designation_meta: runResult.designation_meta,
      });
    } catch (err) {
      await logEvent({
        ctx,
        action: "matching.run_failed",
        resourceType: "case",
        resourceId: id,
        organizationId: scopeOrgId,
        metadata: { case_id: id, error: String((err as Error)?.message ?? err).slice(0, 500) },
        req,
      }).catch(() => {});
      throw err;
    }

    await logEvent({
      ctx,
      action: "matching.run_completed",
      resourceType: "case",
      resourceId: id,
      organizationId: scopeOrgId,
      metadata: {
        case_id: id,
        match_count: runResult.match_count,
        intake_sparse: runResult.input.intake_sparse,
        designation_integration: true,
        designation_policy_version: runResult.designation_meta.policy_version,
        designations_loaded: runResult.designation_meta.designations_loaded,
      },
      req,
    }).catch(() => {});

    await appendCaseTimelineEvent({
      caseId: id,
      organizationId: scopeOrgId,
      actor: { userId: ctx.userId, role: caseResult.access.role },
      eventType: "case.organization_matching_evaluated",
      title: "Recommended organizations evaluated",
      description:
        runResult.match_count === 0
          ? "No matching organizations found for current criteria"
          : `${runResult.match_count} organization(s) suggested based on case needs`,
      metadata: {
        run_group_id: runResult.run_group_id,
        match_count: runResult.match_count,
      },
    }).catch(() => {});

    const latest = await getLatestOrganizationMatchesForCase({ caseId: id, ctx });
    return apiOk({
      run_group_id: runResult.run_group_id,
      match_count: runResult.match_count,
      intake_sparse: runResult.input.intake_sparse,
      matches: latest?.matches.map((m) => matchRunRowToApi(m)) ?? [],
      global_flags: latest?.global_flags ?? [],
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.match-orgs.post.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
