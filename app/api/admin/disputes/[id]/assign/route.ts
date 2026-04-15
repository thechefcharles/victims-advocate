import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  assignDispute,
  serializeForAdmin,
  type DisputeActor,
} from "@/lib/server/trust/signalDisputeService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) return apiFail("FORBIDDEN", "Admin only.", undefined, 403);

    const { id } = await context.params;
    const body = (await req.json().catch(() => null)) as { assigneeId?: unknown } | null;
    const assigneeId = typeof body?.assigneeId === "string" ? body.assigneeId : "";
    if (!assigneeId) return apiFail("VALIDATION_ERROR", "assigneeId is required.");

    const actor: DisputeActor = {
      userId: ctx.userId,
      accountType: ctx.accountType,
      organizationId: ctx.orgId ?? null,
      isAdmin: true,
    };
    const dispute = await assignDispute(actor, id, assigneeId);
    return apiOk(serializeForAdmin(dispute));
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("admin.disputes.assign.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
