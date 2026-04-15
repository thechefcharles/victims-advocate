/**
 * Domain 4.2 — Appointment service layer.
 *
 * Orchestrates state machine, repository, and conflict detection.
 *
 * Non-negotiable ordering inside createAppointment:
 *   1. Validate case_id present (throw VALIDATION_ERROR if missing)
 *   2. checkAppointmentConflicts (throw CONFLICT if overlap)
 *   3. repo.createAppointment (DB write)
 *   4. insertAppointmentEvent (audit trail)
 *
 * Reminder state updates are fire-and-forget — callers must NOT await them
 * in the main request path.
 */

import { AppError } from "@/lib/server/api";
import type { AuthContext } from "@/lib/server/auth";
import type {
  AppointmentRow,
  AvailabilityRuleRow,
  CreateAppointmentInput,
  RescheduleAppointmentInput,
  UpdateReminderStateInput,
} from "./appointmentTypes";
import {
  getAppointmentById,
  listAppointmentsForApplicant,
  listAppointmentsForProviderScope,
  listAppointmentsForCase,
  insertAppointment as dbCreateAppointment,
  updateAppointmentStatus,
  updateAppointmentFields,
  insertRescheduledAppointment,
  updateReminderState,
  insertAppointmentEvent,
} from "./appointmentRepository";
import { validateAppointmentTransition } from "./appointmentStateMachine";
import { checkAppointmentConflicts, getAvailabilityForScheduling } from "./availabilityService";

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Create a new appointment.
 *
 * Order is mandatory:
 *   1. Validate case_id present
 *   2. checkAppointmentConflicts (BEFORE any write)
 *   3. DB write
 *   4. Audit event
 */
export async function createAppointment(params: {
  ctx: AuthContext;
  input: CreateAppointmentInput;
}): Promise<AppointmentRow> {
  const { ctx, input } = params;

  // 1. case_id is non-negotiable — enforced at service AND DB level
  if (!input.case_id) {
    throw new AppError(
      "VALIDATION_ERROR",
      "case_id is required. Every appointment must be linked to a case.",
      undefined,
      422,
    );
  }

  // 2. Conflict check BEFORE write
  await checkAppointmentConflicts({
    organizationId: input.organization_id,
    staffUserId: input.assigned_staff_id ?? null,
    scheduledStart: input.scheduled_start,
    scheduledEnd: input.scheduled_end,
  });

  // 3. DB write
  const appointment = await dbCreateAppointment({ ...input, created_by: ctx.userId });

  // 4. Audit event
  await insertAppointmentEvent({
    appointment_id: appointment.id,
    event_type: "created",
    new_status: "scheduled",
    actor_id: ctx.userId,
  });

  return appointment;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getAppointment(params: {
  ctx: AuthContext;
  id: string;
}): Promise<AppointmentRow> {
  const appointment = await getAppointmentById(params.id);
  if (!appointment) throw new AppError("NOT_FOUND", "Appointment not found", undefined, 404);
  return appointment;
}

export async function listAppointments(params: {
  ctx: AuthContext;
  scope: "applicant" | "provider";
  organizationId?: string;
  staffUserId?: string;
  caseId?: string;
}): Promise<AppointmentRow[]> {
  if (params.scope === "applicant") {
    return listAppointmentsForApplicant(params.ctx.userId);
  }
  if (params.caseId) {
    return listAppointmentsForCase(params.caseId);
  }
  if (!params.organizationId) {
    throw new AppError("VALIDATION_ERROR", "organizationId required for provider scope.", undefined, 422);
  }
  return listAppointmentsForProviderScope(params.organizationId, {
    staffUserId: params.staffUserId,
  });
}

// ---------------------------------------------------------------------------
// Reschedule
// ---------------------------------------------------------------------------

/**
 * Reschedule: marks original as 'rescheduled', creates a new appointment row
 * with rescheduled_from_id set to the original. History is preserved.
 */
export async function rescheduleAppointment(params: {
  ctx: AuthContext;
  id: string;
  input: RescheduleAppointmentInput;
}): Promise<AppointmentRow> {
  const { ctx, id, input } = params;

  const original = await getAppointmentById(id);
  if (!original) throw new AppError("NOT_FOUND", "Appointment not found", undefined, 404);

  validateAppointmentTransition(original.status, "rescheduled");

  // Conflict check on the NEW time window (excluding the original slot)
  await checkAppointmentConflicts({
    organizationId: original.organization_id,
    staffUserId: original.assigned_staff_id,
    scheduledStart: input.scheduled_start,
    scheduledEnd: input.scheduled_end,
    excludeId: id,
  });

  const newAppointment = await insertRescheduledAppointment({
    originalId: id,
    originalRow: original,
    newStart: input.scheduled_start,
    newEnd: input.scheduled_end,
    timezone: input.timezone,
    createdBy: ctx.userId,
    actorAccountType: ctx.accountType,
    reason: input.reason ?? null,
  });

  await insertAppointmentEvent({
    appointment_id: id,
    event_type: "rescheduled",
    previous_status: original.status,
    new_status: "rescheduled",
    metadata: {
      new_appointment_id: newAppointment.id,
      reason: input.reason ?? null,
    },
    actor_id: ctx.userId,
  });

  return newAppointment;
}

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

export async function cancelAppointment(params: {
  ctx: AuthContext;
  id: string;
  reason?: string | null;
}): Promise<AppointmentRow> {
  const appointment = await getAppointmentById(params.id);
  if (!appointment) throw new AppError("NOT_FOUND", "Appointment not found", undefined, 404);

  validateAppointmentTransition(appointment.status, "cancelled");

  const updated = await updateAppointmentStatus({
    id: params.id,
    fromStatus: appointment.status,
    toStatus: "cancelled",
    actorUserId: params.ctx.userId,
    actorAccountType: params.ctx.accountType,
    tenantId: appointment.organization_id ?? null,
    reason: params.reason ?? null,
  });

  await insertAppointmentEvent({
    appointment_id: params.id,
    event_type: "cancelled",
    previous_status: appointment.status,
    new_status: "cancelled",
    metadata: params.reason ? { reason: params.reason } : {},
    actor_id: params.ctx.userId,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Complete
// ---------------------------------------------------------------------------

export async function completeAppointment(params: {
  ctx: AuthContext;
  id: string;
}): Promise<AppointmentRow> {
  const appointment = await getAppointmentById(params.id);
  if (!appointment) throw new AppError("NOT_FOUND", "Appointment not found", undefined, 404);

  validateAppointmentTransition(appointment.status, "completed");

  const updated = await updateAppointmentStatus({
    id: params.id,
    fromStatus: appointment.status,
    toStatus: "completed",
    actorUserId: params.ctx.userId,
    actorAccountType: params.ctx.accountType,
    tenantId: appointment.organization_id ?? null,
  });

  await insertAppointmentEvent({
    appointment_id: params.id,
    event_type: "completed",
    previous_status: appointment.status,
    new_status: "completed",
    actor_id: params.ctx.userId,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Update metadata (notes, staff assignment)
// ---------------------------------------------------------------------------

export async function updateAppointmentMetadata(params: {
  ctx: AuthContext;
  id: string;
  fields: Partial<Pick<AppointmentRow, "notes" | "assigned_staff_id" | "service_type">>;
}): Promise<AppointmentRow> {
  const appointment = await getAppointmentById(params.id);
  if (!appointment) throw new AppError("NOT_FOUND", "Appointment not found", undefined, 404);

  const updated = await updateAppointmentFields({ id: params.id, fields: params.fields });

  if (params.fields.notes !== undefined) {
    await insertAppointmentEvent({
      appointment_id: params.id,
      event_type: "notes_updated",
      actor_id: params.ctx.userId,
    });
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Reminder state (fire-and-forget — never await in request path)
// ---------------------------------------------------------------------------

/**
 * Update reminder state on an appointment. This is consumed by Domain 7.2
 * (Notifications) for delivery scheduling. Appointments owns the STATE only.
 */
export async function updateReminderStateForAppointment(params: {
  id: string;
  input: UpdateReminderStateInput;
}): Promise<AppointmentRow> {
  return updateReminderState(params.id, params.input);
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export async function getAvailabilityForSchedulingContext(params: {
  ctx: AuthContext;
  organizationId: string;
  staffUserId?: string | null;
  programId?: string | null;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}): Promise<AvailabilityRuleRow[]> {
  return getAvailabilityForScheduling({
    organizationId: params.organizationId,
    staffUserId: params.staffUserId,
    programId: params.programId,
    dateRangeStart: params.dateRangeStart,
    dateRangeEnd: params.dateRangeEnd,
  });
}
