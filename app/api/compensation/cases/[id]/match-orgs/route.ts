/**
 * Organization matching for a case — V2 engine (Domain 3.4).
 *
 * GET returns the latest persisted run, split into grassroots + social-service
 * cohorts. POST runs the V2 engine, persists into organization_match_runs
 * (metadata.engine='v2'), and returns both cohorts.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { getCaseById, appendCaseTimelineEvent } from "@/lib/server/data";
import { buildIntakeMatchProfile } from "@/lib/server/matching/v2/intakeProfileBuilder";
import { loadOrgsForMatching } from "@/lib/server/matching/v2/orgLoader";
import { rankOrgs } from "@/lib/server/matching/v2/rank";
import {
  persistV2MatchRun,
  getV2MatchResults,
} from "@/lib/server/matching/v2/matchRunAdapter";

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

    const caseResult = await getCaseById({ caseId: id, ctx });
    if (!caseResult) {
      return apiFail("FORBIDDEN", "Access denied", undefined, 403);
    }

    const results = await getV2MatchResults(id);
    return apiOk({
      run_group_id: results.runGroupId,
      created_at: results.createdAt,
      grassroots: results.grassroots,
      socialService: results.socialService,
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
        403,
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
      metadata: { case_id: id, engine: "v2" },
      req,
    }).catch(() => {});

    let runGroupId: string;
    let resultSet: Awaited<ReturnType<typeof rankOrgs>>;
    try {
      const intake = await buildIntakeMatchProfile(id);
      const stateCode = (caseResult.case as { state_code?: string | null }).state_code ?? null;
      const orgs = await loadOrgsForMatching({ stateCode });
      resultSet = rankOrgs(orgs, intake);

      const persisted = await persistV2MatchRun({
        caseId: id,
        scopeOrganizationId: scopeOrgId,
        actorUserId: ctx.userId,
        resultSet,
      });
      runGroupId = persisted.runGroupId;
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

    const matchCount = resultSet.grassroots.length + resultSet.socialService.length;

    await logEvent({
      ctx,
      action: "matching.run_completed",
      resourceType: "case",
      resourceId: id,
      organizationId: scopeOrgId,
      metadata: {
        case_id: id,
        engine: "v2",
        match_count: matchCount,
        grassroots_count: resultSet.grassroots.length,
        social_service_count: resultSet.socialService.length,
        geography_expanded: resultSet.geographyExpanded,
        total_evaluated: resultSet.totalEvaluated,
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
        matchCount === 0
          ? "No matching organizations found for current criteria"
          : `${matchCount} organization(s) suggested based on case needs`,
      metadata: {
        run_group_id: runGroupId,
        match_count: matchCount,
        engine: "v2",
      },
    }).catch(() => {});

    return apiOk({
      run_group_id: runGroupId,
      match_count: matchCount,
      grassroots: resultSet.grassroots,
      socialService: resultSet.socialService,
      geographyExpanded: resultSet.geographyExpanded,
      totalEvaluated: resultSet.totalEvaluated,
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
