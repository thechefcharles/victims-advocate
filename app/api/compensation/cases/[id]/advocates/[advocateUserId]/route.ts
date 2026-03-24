/**
 * Victim (case owner) removes an advocate from a case.
 */

import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { requireRole } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError, AppError } from "@/lib/server/api";
import { getCaseById } from "@/lib/server/data";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/server/logging";
import { syncConnectionRequestsAfterVictimRemovesAdvocateFromCase } from "@/lib/server/advocate/syncConnectionRequestsAfterVictimRemovesAdvocate";

interface RouteParams {
  params: Promise<{ id: string; advocateUserId: string }>;
}

export async function DELETE(_req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(_req);
    requireFullAccess(ctx, _req);
    requireRole(ctx, "victim");

    const { id: caseId, advocateUserId } = await context.params;
    if (!caseId?.trim() || !advocateUserId?.trim()) {
      return apiFail("VALIDATION_ERROR", "Missing case or advocate id", undefined, 400);
    }

    const result = await getCaseById({ caseId, ctx });
    if (!result) {
      return apiFail("FORBIDDEN", "Access denied", undefined, 403);
    }

    const ownerId = result.case.owner_user_id as string;
    if (ownerId !== ctx.userId) {
      return apiFail("FORBIDDEN", "Only the case owner can remove advocates", undefined, 403);
    }

    const supabase = getSupabaseAdmin();

    const { data: accessRow, error: accErr } = await supabase
      .from("case_access")
      .select("id, role")
      .eq("case_id", caseId)
      .eq("user_id", advocateUserId)
      .maybeSingle();

    if (accErr) {
      throw new AppError("INTERNAL", "Permission check failed", undefined, 500);
    }
    if (!accessRow || accessRow.role !== "advocate") {
      return apiFail("NOT_FOUND", "Advocate not found on this case", undefined, 404);
    }

    const { error: delErr } = await supabase
      .from("case_access")
      .delete()
      .eq("case_id", caseId)
      .eq("user_id", advocateUserId)
      .eq("role", "advocate");

    if (delErr) {
      throw new AppError("INTERNAL", "Failed to remove advocate", undefined, 500);
    }

    await syncConnectionRequestsAfterVictimRemovesAdvocateFromCase({
      victimUserId: ctx.userId,
      advocateUserId,
      caseId,
    });

    logger.info("compensation.cases.advocate.removed", {
      caseId,
      advocateUserId,
      victimId: ctx.userId,
    });

    return apiOk({ removed: true });
  } catch (err) {
    const appErr = toAppError(err);
    logger.error("compensation.cases.advocate.delete.error", {
      code: appErr.code,
      message: appErr.message,
    });
    return apiFailFromError(appErr);
  }
}
