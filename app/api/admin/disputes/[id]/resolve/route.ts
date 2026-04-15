import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import {
  resolveDispute,
  serializeForAdmin,
  type DisputeActor,
} from "@/lib/server/trust/signalDisputeService";
import type { SignalDisputeOutcome } from "@/lib/server/trust/signalDisputeTypes";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ALLOWED_OUTCOMES: ReadonlySet<SignalDisputeOutcome> = new Set([
  "resolved_upheld",
  "resolved_annotated",
  "resolved_removed",
]);

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);
    if (!ctx.isAdmin) return apiFail("FORBIDDEN", "Admin only.", undefined, 403);

    const { id } = await context.params;
    const body = (await req.json().catch(() => null)) as {
      outcome?: unknown;
      resolutionReason?: unknown;
      adminNotes?: unknown;
    } | null;
    if (!body) return apiFail("VALIDATION_ERROR", "Body is required.");

    const outcome = body.outcome;
    if (typeof outcome !== "string" || !ALLOWED_OUTCOMES.has(outcome as SignalDisputeOutcome)) {
      return apiFail(
        "VALIDATION_ERROR",
        "outcome must be resolved_upheld | resolved_annotated | resolved_removed.",
      );
    }

    const actor: DisputeActor = {
      userId: ctx.userId,
      accountType: ctx.accountType,
      organizationId: ctx.orgId ?? null,
      isAdmin: true,
    };
    const dispute = await resolveDispute(actor, id, {
      outcome: outcome as SignalDisputeOutcome,
      resolutionReason: String(body.resolutionReason ?? ""),
      adminNotes: typeof body.adminNotes === "string" ? body.adminNotes : undefined,
    });
    return apiOk(serializeForAdmin(dispute));
  } catch (err) {
    const appErr = toAppError(err);
    logger.warn("admin.disputes.resolve.error", { code: appErr.code });
    return apiFailFromError(appErr);
  }
}
