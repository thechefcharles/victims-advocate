/**
 * Domain 4.2 — Appointment serializers.
 *
 * Four context-aware views:
 *   serializeForApplicant   — scheduling info only, no provider operational detail
 *   serializeForProvider    — full operational detail
 *   serializeForProviderList — lightweight, optimized for list/calendar rendering
 *   serializeForAdmin       — full AppointmentRow + metadata
 */

import type { AppointmentRow } from "./appointmentTypes";

// ---------------------------------------------------------------------------
// Applicant view
// ---------------------------------------------------------------------------

export type ApplicantAppointmentView = {
  id: string;
  status: string;
  service_type: string;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  next_reminder_at: string | null;
  created_at: string;
};

/**
 * Strips all provider-internal detail:
 *   - No staff assignment details
 *   - No case_id / organization_id (provider-internal)
 *   - No rescheduled_from_id chain
 *   - No notes (may contain provider-internal context)
 *   - No reminder_status / last_reminded_at (operational only)
 */
export function serializeForApplicant(row: AppointmentRow): ApplicantAppointmentView {
  return {
    id: row.id,
    status: row.status,
    service_type: row.service_type,
    scheduled_start: row.scheduled_start,
    scheduled_end: row.scheduled_end,
    timezone: row.timezone,
    next_reminder_at: row.next_reminder_at,
    created_at: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Provider full view
// ---------------------------------------------------------------------------

export type ProviderAppointmentView = {
  id: string;
  case_id: string;
  organization_id: string;
  program_id: string | null;
  service_type: string;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  status: string;
  assigned_staff_id: string | null;
  notes: string | null;
  rescheduled_from_id: string | null;
  next_reminder_at: string | null;
  reminder_status: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function serializeForProvider(row: AppointmentRow): ProviderAppointmentView {
  return {
    id: row.id,
    case_id: row.case_id,
    organization_id: row.organization_id,
    program_id: row.program_id,
    service_type: row.service_type,
    scheduled_start: row.scheduled_start,
    scheduled_end: row.scheduled_end,
    timezone: row.timezone,
    status: row.status,
    assigned_staff_id: row.assigned_staff_id,
    notes: row.notes,
    rescheduled_from_id: row.rescheduled_from_id,
    next_reminder_at: row.next_reminder_at,
    reminder_status: row.reminder_status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Provider list / calendar view (lighter weight)
// ---------------------------------------------------------------------------

export type ProviderListAppointmentView = {
  id: string;
  case_id: string;
  service_type: string;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  status: string;
  assigned_staff_id: string | null;
};

export function serializeForProviderList(row: AppointmentRow): ProviderListAppointmentView {
  return {
    id: row.id,
    case_id: row.case_id,
    service_type: row.service_type,
    scheduled_start: row.scheduled_start,
    scheduled_end: row.scheduled_end,
    timezone: row.timezone,
    status: row.status,
    assigned_staff_id: row.assigned_staff_id,
  };
}

// ---------------------------------------------------------------------------
// Admin view
// ---------------------------------------------------------------------------

/** Full AppointmentRow — all fields, no redactions. */
export function serializeForAdmin(row: AppointmentRow): AppointmentRow {
  return { ...row };
}
