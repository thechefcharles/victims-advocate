import { NextResponse } from "next/server";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { getCaseById, appendCaseTimelineEvent } from "@/lib/server/data";
import { amendIntakeField } from "@/lib/intake/amend";
import { parseApplicationFromCase, updateCaseApplication } from "@/lib/intake/apiHelpers";

/** Only advocate/admin can amend; owner (victim) cannot. */
export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiFail("VALIDATION_ERROR", "Invalid JSON body", undefined, 400);
    }
    const caseId = body.caseId ?? body.case_id;
    const fieldKey = body.fieldKey ?? body.field_key;
    const newValue = body.newValue;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!caseId || typeof caseId !== "string" || !fieldKey || typeof fieldKey !== "string") {
      return apiFail("VALIDATION_ERROR", "caseId and fieldKey are required", undefined, 400);
    }
    if (!reason) {
      return apiFail("VALIDATION_ERROR", "Amendment reason is required", undefined, 422);
    }

    const result = await getCaseById({ caseId, ctx });
    if (!result) return apiFail("FORBIDDEN", "Access denied", undefined, 403);
    if (!result.access.can_edit) return apiFail("FORBIDDEN", "Cannot edit this case", undefined, 403);
    if (result.access.role === "owner") {
      return apiFail("FORBIDDEN", "Only advocates or admins can amend intake; use the intake form to edit.", undefined, 403);
    }

    const application = parseApplicationFromCase(result.case as Record<string, unknown>);
    if (!application) return apiFail("VALIDATION_ERROR", "Case has no application data", undefined, 422);

    const { application: updated } = amendIntakeField({
      caseId,
      fieldKey,
      newValue,
      reason,
      ctx,
      application,
    });

    await updateCaseApplication(caseId, updated);

    const orgId = (result.case as Record<string, unknown>).organization_id as string | undefined;
    if (orgId) {
      appendCaseTimelineEvent({
        caseId,
        organizationId: orgId,
        actor: { userId: ctx.userId, role: result.access.role ?? undefined },
        eventType: "case.intake_amended",
        title: "Intake field amended",
        description: null,
        metadata: { field_key: fieldKey },
      }).catch(() => {});
    }

    logEvent({
      ctx,
      action: "intake.field_amended",
      resourceType: "case",
      resourceId: caseId,
      metadata: { field_key: fieldKey, case_id: caseId, org_id: orgId ?? null },
      req,
    }).catch(() => {});

    logger.info("intake.amend", { caseId, fieldKey, userId: ctx.userId });
    return NextResponse.json({ ok: true, data: { application: updated } });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("intake.amend.error", { code: appErr.code, message: appErr.message });
    return apiFailFromError(appErr);
  }
}
