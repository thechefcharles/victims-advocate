import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { getCaseById, appendCaseTimelineEvent } from "@/lib/server/data";
import { getFieldStateMap, setFieldState, makeSkippedEntry, mergeFieldState, stripFieldState } from "@/lib/intake/fieldState";
import { canSkip } from "@/lib/intake/fieldConfig";
import { parseApplicationFromCase, updateCaseApplication } from "@/lib/intake/apiHelpers";

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 400);
    }
    const caseId = body.caseId ?? body.case_id;
    const fieldKey = body.fieldKey ?? body.field_key;
    if (!caseId || typeof caseId !== "string" || !fieldKey || typeof fieldKey !== "string") {
      return apiFail("VALIDATION_ERROR", "caseId and fieldKey are required", undefined, 400);
    }

    if (!canSkip(fieldKey)) {
      return apiFail("VALIDATION_ERROR", "This field does not allow skip", undefined, 422);
    }

    const result = await getCaseById({ caseId, ctx });
    if (!result) return apiFail("FORBIDDEN", "Access denied", undefined, 403);
    if (!result.access.can_edit) return apiFail("FORBIDDEN", "Cannot edit this case", undefined, 403);

    const application = parseApplicationFromCase(result.case as Record<string, unknown>);
    if (!application) return apiFail("VALIDATION_ERROR", "Case has no application data", undefined, 422);

    const clean = stripFieldState(application) as Record<string, unknown>;
    const stateMap = getFieldStateMap(application);
    const newState = setFieldState(stateMap, fieldKey, makeSkippedEntry("user"));
    const updated = mergeFieldState(clean, newState);

    await updateCaseApplication(caseId, updated);

    const orgId = (result.case as Record<string, unknown>).organization_id as string | undefined;
    if (orgId) {
      appendCaseTimelineEvent({
        caseId,
        organizationId: orgId,
        actor: { userId: ctx.userId, role: result.access.role ?? undefined },
        eventType: "case.intake_field_skipped",
        title: "Intake question skipped",
        description: null,
        metadata: { field_key: fieldKey },
      }).catch(() => {});
    }

    logEvent({
      ctx,
      action: "intake.field_skipped",
      resourceType: "case",
      resourceId: caseId,
      metadata: { field_key: fieldKey, case_id: caseId, org_id: orgId ?? null },
      req,
    }).catch(() => {});

    logger.info("intake.skip", { caseId, fieldKey, userId: ctx.userId });
    return NextResponse.json({ ok: true, data: { application: updated } });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("intake.skip.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
