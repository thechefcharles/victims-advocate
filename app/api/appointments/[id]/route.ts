import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { getAppointment } from "@/lib/server/appointments/appointmentService";
import {
  serializeForApplicant,
  serializeForProvider,
  serializeForAdmin,
} from "@/lib/server/appointments/appointmentSerializer";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(req: Request, context: RouteParams) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const { id } = await context.params;
    const appointment = await getAppointment({ ctx, id });

    const actor = buildActor(ctx);
    const decision = await can("appointment:view", actor, {
      type: "appointment",
      id,
      tenantId: appointment.organization_id,
      ownerId: undefined, // resolved via case owner in service layer for applicants
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    if (ctx.accountType === "applicant") {
      return apiOk({ appointment: serializeForApplicant(appointment) });
    }
    if (ctx.isAdmin) {
      return apiOk({ appointment: serializeForAdmin(appointment) });
    }
    return apiOk({ appointment: serializeForProvider(appointment) });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("appointments.get.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
