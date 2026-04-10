import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiFail, apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { logEvent } from "@/lib/server/audit/logEvent";
import { getCaseById } from "@/lib/server/data";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;

    if (!id) {
      return apiFail("VALIDATION_ERROR", "Missing id", undefined, 400);
    }

    const result = await getCaseById({ caseId: id, ctx, req });
    if (!result) {
      return apiFail("FORBIDDEN", "Access denied", undefined, 403);
    }

    logEvent({
      ctx,
      action: "case.view",
      resourceType: "case",
      resourceId: id,
      metadata: { method: "GET", path: `/api/compensation/cases/${id}` },
      req,
    }).catch(() => {});
    logger.info("compensation.cases.get", { caseId: id, userId: ctx.userId });
    return NextResponse.json({
      case: result.case,
      documents: result.documents,
      access: result.access,
    });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.get.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}

export async function PATCH(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;

    if (!id) {
      return apiFail("VALIDATION_ERROR", "Missing id", undefined, 400);
    }

    const result = await getCaseById({ caseId: id, ctx, req });
    if (!result || !result.access.can_edit) {
      return apiFail("FORBIDDEN", "Forbidden", undefined, 403);
    }

    const supabaseAdmin = getSupabaseAdmin();

    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      return apiFail("VALIDATION_ERROR", "We couldn't read that request. Refresh the page and try again.", undefined, 400);
    }

    const b = body as Record<string, unknown>;
    const application = b?.application;
    const name = b?.name;
    const eligibilityAnswers = b?.eligibility_answers;
    const eligibilityResult = b?.eligibility_result;
    const eligibilityReadiness = b?.eligibility_readiness;
    const state_code = b?.state_code;

    const hasUpdates =
      application !== undefined ||
      name !== undefined ||
      eligibilityAnswers !== undefined ||
      eligibilityResult !== undefined ||
      eligibilityReadiness !== undefined ||
      state_code !== undefined;

    if (!hasUpdates) {
      return apiFail(
        "VALIDATION_ERROR",
        "Provide application, name, state_code, and/or eligibility fields to update",
        undefined,
        400
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (application !== undefined) {
      updates.application =
        typeof application === "string" ? application : JSON.stringify(application);
    }
    if (name !== undefined) {
      updates.name = typeof name === "string" ? (name as string).trim() || null : null;
    }
    if (eligibilityAnswers !== undefined) {
      updates.eligibility_answers =
        typeof eligibilityAnswers === "object" && eligibilityAnswers
          ? eligibilityAnswers
          : null;
    }
    if (eligibilityResult !== undefined) {
      const allowed = ["eligible", "needs_review", "not_eligible"];
      updates.eligibility_result =
        typeof eligibilityResult === "string" && allowed.includes(eligibilityResult)
          ? eligibilityResult
          : null;
    }
    if (eligibilityReadiness !== undefined) {
      const allowed = ["ready", "missing_info", "not_ready"];
      updates.eligibility_readiness =
        typeof eligibilityReadiness === "string" &&
        allowed.includes(eligibilityReadiness)
          ? eligibilityReadiness
          : null;
    }
    if (eligibilityAnswers !== undefined || eligibilityResult !== undefined) {
      updates.eligibility_completed_at = new Date().toISOString();
    }

    if (state_code !== undefined) {
      const sc = typeof state_code === "string" ? state_code.trim().toUpperCase() : "";
      if (sc === "IL" || sc === "IN") {
        updates.state_code = sc;
      } else {
        return apiFail("VALIDATION_ERROR", "state_code must be IL or IN", undefined, 400);
      }
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("cases")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      throw new AppError("INTERNAL", "Failed to update case", updateError, 500);
    }

    logger.info("compensation.cases.patch", { caseId: id, userId: ctx.userId });
    return NextResponse.json({ case: updated });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.patch.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}

export async function DELETE(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    const { id } = await context.params;

    if (!id) {
      return apiFail("VALIDATION_ERROR", "Missing id", undefined, 400);
    }

    const result = await getCaseById({ caseId: id, ctx, req });
    if (!result) {
      return apiFail("FORBIDDEN", "Access denied", undefined, 403);
    }
    if (!result.access.can_edit || result.access.role !== "owner") {
      return apiFail("FORBIDDEN", "Only the case owner can delete this case", undefined, 403);
    }

    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin.from("case_access").delete().eq("case_id", id);
    await supabaseAdmin.from("documents").delete().eq("case_id", id);

    const { error: deleteError } = await supabaseAdmin
      .from("cases")
      .delete()
      .eq("id", id)
      .eq("owner_user_id", ctx.userId);

    if (deleteError) {
      throw new AppError("INTERNAL", "Failed to delete case", deleteError, 500);
    }

    logger.info("compensation.cases.delete", { caseId: id, userId: ctx.userId });
    return NextResponse.json({ success: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.delete.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
