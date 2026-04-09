import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getAppointment, cancelAppointment } from "@/lib/server/appointments/appointmentService";
import { serializeForProvider, serializeForApplicant } from "@/lib/server/appointments/appointmentSerializer";
import { z } from "zod";

const cancelBodySchema = z.object({
  reason: z.string().max(2000).nullable().optional(),
});

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const existing = await getAppointment({ ctx, id });

    const actor = buildActor(ctx);
    const decision = await can("appointment:cancel", actor, {
      type: "appointment",
      id,
      tenantId: existing.organization_id,
      status: existing.status,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = cancelBodySchema.safeParse(body);
    const reason = parsed.success ? parsed.data.reason : null;

    const updated = await cancelAppointment({ ctx, id, reason });

    if (ctx.accountType === "applicant") {
      return apiOk({ appointment: serializeForApplicant(updated) });
    }
    return apiOk({ appointment: serializeForProvider(updated) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("appointments.cancel.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
