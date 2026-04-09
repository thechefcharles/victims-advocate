import { getAuthContext, requireFullAccess } from "@/lib/server/auth";
import { can } from "@/lib/server/policy/policyEngine";
import { buildActor } from "@/lib/server/policy/policyTypes";
import { apiOk, apiFail, apiFailFromError, toAppError } from "@/lib/server/api";
import { logger } from "@/lib/server/logging";
import { createAppointment, listAppointments } from "@/lib/server/appointments/appointmentService";
import {
  serializeForApplicant,
  serializeForProvider,
  serializeForProviderList,
  serializeForAdmin,
} from "@/lib/server/appointments/appointmentSerializer";
import { z } from "zod";

const createAppointmentBodySchema = z.object({
  case_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  program_id: z.string().uuid().nullable().optional(),
  service_type: z.string().min(1).max(255),
  scheduled_start: z.string().datetime({ offset: true }),
  scheduled_end: z.string().datetime({ offset: true }),
  timezone: z.string().optional(),
  assigned_staff_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const actor = buildActor(ctx);
    const decision = await can("appointment:list", actor, { type: "appointment", id: null });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    if (ctx.accountType === "applicant") {
      const appointments = await listAppointments({ ctx, scope: "applicant" });
      return apiOk({ appointments: appointments.map(serializeForApplicant) });
    }

    const { searchParams } = new URL(req.url);
    const orgId = ctx.isAdmin
      ? (searchParams.get("organization_id") ?? ctx.orgId)
      : ctx.orgId;
    const caseId = searchParams.get("case_id") ?? undefined;
    const staffUserId = searchParams.get("staff_user_id") ?? undefined;

    if (!orgId && !caseId) {
      return apiFail("VALIDATION_ERROR", "organization_id or case_id required.", undefined, 422);
    }

    const appointments = await listAppointments({
      ctx,
      scope: "provider",
      organizationId: orgId ?? undefined,
      staffUserId,
      caseId,
    });

    const serialized = ctx.isAdmin
      ? appointments.map(serializeForAdmin)
      : appointments.map(serializeForProviderList);

    return apiOk({ appointments: serialized });
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("appointments.list.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    requireFullAccess(ctx, req);

    const body = await req.json();
    const parsed = createAppointmentBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiFail("VALIDATION_ERROR", "Invalid appointment input.", parsed.error.flatten(), 422);
    }

    const actor = buildActor(ctx);
    const decision = await can("appointment:create", actor, {
      type: "appointment",
      id: null,
      tenantId: parsed.data.organization_id,
    });
    if (!decision.allowed) {
      return apiFail("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
    }

    const appointment = await createAppointment({ ctx, input: parsed.data });
    return apiOk({ appointment: serializeForProvider(appointment) }, undefined, 201);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr.code === "INTERNAL") {
      logger.error("appointments.create.error", { code: appErr.code, message: appErr.message });
    }
    return apiFailFromError(appErr);
  }
}
