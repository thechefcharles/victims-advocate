/**
 * Domain 4.2 — Appointment repository.
 * All DB access for appointments, availability_rules, appointment_events.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import { transition } from "@/lib/server/workflow/engine";
import type {
  AppointmentRow,
  AvailabilityRuleRow,
  AppointmentEventRow,
  AppointmentEventType,
  AppointmentStatus,
  CreateAppointmentInput,
  UpdateReminderStateInput,
} from "./appointmentTypes";

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function asAppointmentRow(r: Record<string, unknown>): AppointmentRow {
  return {
    id: r.id as string,
    case_id: r.case_id as string,
    organization_id: r.organization_id as string,
    program_id: (r.program_id as string | null) ?? null,
    service_type: r.service_type as string,
    scheduled_start: r.scheduled_start as string,
    scheduled_end: r.scheduled_end as string,
    timezone: (r.timezone as string) ?? "UTC",
    status: r.status as AppointmentStatus,
    assigned_staff_id: (r.assigned_staff_id as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    rescheduled_from_id: (r.rescheduled_from_id as string | null) ?? null,
    next_reminder_at: (r.next_reminder_at as string | null) ?? null,
    reminder_status: (r.reminder_status as string | null) ?? null,
    last_reminded_at: (r.last_reminded_at as string | null) ?? null,
    created_by: r.created_by as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Appointment reads
// ---------------------------------------------------------------------------

export async function getAppointmentById(id: string): Promise<AppointmentRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", "Appointment lookup failed", undefined, 500);
  return data ? asAppointmentRow(data as Record<string, unknown>) : null;
}

/** All appointments for a given case. */
export async function listAppointmentsForCase(caseId: string): Promise<AppointmentRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("case_id", caseId)
    .order("scheduled_start", { ascending: true });
  if (error) throw new AppError("INTERNAL", "Failed to list appointments for case", undefined, 500);
  return (data ?? []).map((r) => asAppointmentRow(r as Record<string, unknown>));
}

/**
 * Applicant view — joins through cases via case_id to find all appointments
 * where the case's owner_user_id matches the applicant.
 */
export async function listAppointmentsForApplicant(
  applicantUserId: string,
): Promise<AppointmentRow[]> {
  const supabase = getSupabaseAdmin();
  // Supabase doesn't support cross-table filtering in a single query without a view,
  // so we first fetch case IDs owned by this user, then fetch appointments.
  const { data: cases, error: caseErr } = await supabase
    .from("cases")
    .select("id")
    .eq("owner_user_id", applicantUserId);
  if (caseErr) throw new AppError("INTERNAL", "Failed to resolve applicant cases", undefined, 500);
  const caseIds = (cases ?? []).map((c: Record<string, unknown>) => c.id as string);
  if (!caseIds.length) return [];

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .in("case_id", caseIds)
    .not("status", "in", '("cancelled")')
    .order("scheduled_start", { ascending: true });
  if (error) throw new AppError("INTERNAL", "Failed to list applicant appointments", undefined, 500);
  return (data ?? []).map((r) => asAppointmentRow(r as Record<string, unknown>));
}

/** Provider org-scoped list — returns all appointments for the org, including historical. */
export async function listAppointmentsForProviderScope(
  organizationId: string,
  filters?: { staffUserId?: string; status?: AppointmentStatus },
): Promise<AppointmentRow[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("appointments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("scheduled_start", { ascending: false });

  if (filters?.staffUserId) {
    query = query.eq("assigned_staff_id", filters.staffUserId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL", "Failed to list appointments for org", undefined, 500);
  return (data ?? []).map((r) => asAppointmentRow(r as Record<string, unknown>));
}

/**
 * Conflict check query — returns any overlapping active appointments for the
 * same staff member in the same time window. Must be called BEFORE any DB write.
 */
export async function findConflictingAppointments(params: {
  organizationId: string;
  staffUserId?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  excludeId?: string;
}): Promise<AppointmentRow[]> {
  const supabase = getSupabaseAdmin();
  // Overlap: existing.start < new.end AND existing.end > new.start
  let query = supabase
    .from("appointments")
    .select("*")
    .eq("organization_id", params.organizationId)
    .in("status", ["scheduled", "rescheduled"])
    .lt("scheduled_start", params.scheduledEnd)
    .gt("scheduled_end", params.scheduledStart);

  if (params.staffUserId) {
    query = query.eq("assigned_staff_id", params.staffUserId);
  }
  if (params.excludeId) {
    query = query.neq("id", params.excludeId);
  }

  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL", "Conflict check query failed", undefined, 500);
  return (data ?? []).map((r) => asAppointmentRow(r as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Appointment writes
// ---------------------------------------------------------------------------

export async function insertAppointment(
  input: CreateAppointmentInput & { created_by: string },
): Promise<AppointmentRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      case_id: input.case_id,
      organization_id: input.organization_id,
      program_id: input.program_id ?? null,
      service_type: input.service_type,
      scheduled_start: input.scheduled_start,
      scheduled_end: input.scheduled_end,
      timezone: input.timezone ?? "UTC",
      status: "scheduled",
      assigned_staff_id: input.assigned_staff_id ?? null,
      notes: input.notes ?? null,
      created_by: input.created_by,
    })
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to create appointment", undefined, 500);
  return asAppointmentRow(data as Record<string, unknown>);
}

export async function updateAppointmentStatus(params: {
  id: string;
  fromStatus: AppointmentStatus;
  toStatus: AppointmentStatus;
  actorUserId: string;
  actorAccountType: string;
  tenantId?: string | null;
  reason?: string | null;
}): Promise<AppointmentRow> {
  const supabase = getSupabaseAdmin();

  // Rule 16 (Transition Law): every status write must pass through the
  // workflow transition engine, which validates the edge and appends an
  // actor-stamped row to workflow_state_log before any DB mutation.
  const result = await transition(
    {
      entityType: "appointment_status",
      entityId: params.id,
      fromState: params.fromStatus,
      toState: params.toStatus,
      actorUserId: params.actorUserId,
      actorAccountType: params.actorAccountType,
      tenantId: params.tenantId ?? undefined,
      metadata: params.reason ? { reason: params.reason } : undefined,
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError(
      result.reason === "STATE_INVALID" ? "VALIDATION_ERROR" : "INTERNAL",
      `Appointment transition ${params.fromStatus} → ${params.toStatus} failed: ${result.reason}`,
      undefined,
      result.reason === "STATE_INVALID" ? 422 : 500,
    );
  }

  // Optimistic-concurrency guard: only flip status if it is still fromStatus.
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: params.toStatus })
    .eq("id", params.id)
    .eq("status", params.fromStatus)
    .select()
    .single();
  if (error || !data) {
    throw new AppError("INTERNAL", "Failed to update appointment status", undefined, 500);
  }
  return asAppointmentRow(data as Record<string, unknown>);
}

export async function updateAppointmentFields(params: {
  id: string;
  fields: Partial<Pick<AppointmentRow, "notes" | "assigned_staff_id" | "service_type">>;
}): Promise<AppointmentRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("appointments")
    .update(params.fields)
    .eq("id", params.id)
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to update appointment", undefined, 500);
  return asAppointmentRow(data as Record<string, unknown>);
}

/**
 * Creates the rescheduled appointment row and marks the original as rescheduled.
 * Returns the new appointment. rescheduled_from_id links the chain.
 */
export async function insertRescheduledAppointment(params: {
  originalId: string;
  originalRow: AppointmentRow;
  newStart: string;
  newEnd: string;
  timezone?: string;
  createdBy: string;
  actorAccountType: string;
  reason?: string | null;
}): Promise<AppointmentRow> {
  const supabase = getSupabaseAdmin();

  // 1. Gate the original's status flip through the workflow transition engine.
  //    This records actor + reason in workflow_state_log before any DB mutation.
  const result = await transition(
    {
      entityType: "appointment_status",
      entityId: params.originalId,
      fromState: params.originalRow.status,
      toState: "rescheduled",
      actorUserId: params.createdBy,
      actorAccountType: params.actorAccountType,
      tenantId: params.originalRow.organization_id ?? undefined,
      metadata: params.reason ? { reason: params.reason } : undefined,
    },
    supabase,
  );
  if (!result.success) {
    throw new AppError(
      result.reason === "STATE_INVALID" ? "VALIDATION_ERROR" : "INTERNAL",
      `Appointment transition ${params.originalRow.status} → rescheduled failed: ${result.reason}`,
      undefined,
      result.reason === "STATE_INVALID" ? 422 : 500,
    );
  }

  // 2. Flip the original's status (optimistic concurrency via fromStatus eq).
  const { error: origErr } = await supabase
    .from("appointments")
    .update({ status: "rescheduled" })
    .eq("id", params.originalId)
    .eq("status", params.originalRow.status);
  if (origErr) throw new AppError("INTERNAL", "Failed to mark original appointment rescheduled", undefined, 500);

  // 3. Insert new appointment linked via rescheduled_from_id
  //    (initial state — not a transition, no workflow log entry needed).
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      case_id: params.originalRow.case_id,
      organization_id: params.originalRow.organization_id,
      program_id: params.originalRow.program_id,
      service_type: params.originalRow.service_type,
      scheduled_start: params.newStart,
      scheduled_end: params.newEnd,
      timezone: params.timezone ?? params.originalRow.timezone,
      status: "scheduled",
      assigned_staff_id: params.originalRow.assigned_staff_id,
      notes: params.originalRow.notes,
      rescheduled_from_id: params.originalId,
      created_by: params.createdBy,
    })
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to create rescheduled appointment", undefined, 500);
  return asAppointmentRow(data as Record<string, unknown>);
}

export async function updateReminderState(
  id: string,
  input: UpdateReminderStateInput,
): Promise<AppointmentRow> {
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {
    next_reminder_at: input.next_reminder_at,
  };
  if (input.reminder_status !== undefined) update.reminder_status = input.reminder_status;
  if (input.last_reminded_at !== undefined) update.last_reminded_at = input.last_reminded_at;

  const { data, error } = await supabase
    .from("appointments")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to update reminder state", undefined, 500);
  return asAppointmentRow(data as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Appointment events
// ---------------------------------------------------------------------------

export async function insertAppointmentEvent(params: {
  appointment_id: string;
  event_type: AppointmentEventType;
  previous_status?: string | null;
  new_status?: string | null;
  metadata?: Record<string, unknown>;
  actor_id?: string | null;
}): Promise<AppointmentEventRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("appointment_events")
    .insert({
      appointment_id: params.appointment_id,
      event_type: params.event_type,
      previous_status: params.previous_status ?? null,
      new_status: params.new_status ?? null,
      metadata: params.metadata ?? {},
      actor_id: params.actor_id ?? null,
    })
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to record appointment event", undefined, 500);
  return data as AppointmentEventRow;
}

// ---------------------------------------------------------------------------
// Availability rules
// ---------------------------------------------------------------------------

export async function getAvailabilityRulesForContext(params: {
  organizationId: string;
  staffUserId?: string | null;
  programId?: string | null;
}): Promise<AvailabilityRuleRow[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("availability_rules")
    .select("*")
    .eq("organization_id", params.organizationId);

  if (params.staffUserId) {
    query = query.eq("staff_user_id", params.staffUserId);
  }
  if (params.programId) {
    query = query.eq("program_id", params.programId);
  }

  const { data, error } = await query.order("effective_from", { ascending: true });
  if (error) throw new AppError("INTERNAL", "Failed to fetch availability rules", undefined, 500);
  return (data ?? []) as AvailabilityRuleRow[];
}
