import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getAppointment, rescheduleAppointment } from "@/lib/server/appointments/appointmentService";
import { serializeForProvider } from "@/lib/server/appointments/appointmentSerializer";
import { z } from "zod";

const rescheduleBodySchema = z.object({
  scheduled_start: z.string().datetime({ offset: true }),
  scheduled_end: z.string().datetime({ offset: true }),
  timezone: z.string().optional(),
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
    const decision = await can("appointment:reschedule", actor, {
      type: "appointment",
      id,
      tenantId: existing.organization_id,
      status: existing.status,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const body = await req.json();
    const parsed = rescheduleBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiFail("VALIDATION_ERROR", "Invalid reschedule input.", parsed.error.flatten(), 422);
    }

    const newAppointment = await rescheduleAppointment({ ctx, id, input: parsed.data });
    return apiOk({ appointment: serializeForProvider(newAppointment) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("appointments.reschedule.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
