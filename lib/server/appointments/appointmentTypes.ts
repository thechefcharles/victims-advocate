/**
 * Domain 4.2 — Appointment types.
 *
 * Data class: Class A — Restricted.
 * Never return AppointmentRow directly from a route — always use a serializer.
 */

// ---------------------------------------------------------------------------
// Status enum
// ---------------------------------------------------------------------------

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "rescheduled",
  "cancelled",
  "completed",
  "no_show",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Terminal states — no further transitions allowed. */
export const APPOINTMENT_TERMINAL_STATUSES = new Set<AppointmentStatus>([
  "cancelled",
  "completed",
  "no_show",
]);

// ---------------------------------------------------------------------------
// DB row shape
// ---------------------------------------------------------------------------

export type AppointmentRow = {
  id: string;
  case_id: string; // NOT NULL — system law
  organization_id: string;
  program_id: string | null;
  service_type: string;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  status: AppointmentStatus;
  assigned_staff_id: string | null;
  notes: string | null;
  rescheduled_from_id: string | null;
  next_reminder_at: string | null;
  reminder_status: string | null;
  last_reminded_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type AvailabilityRuleRow = {
  id: string;
  organization_id: string;
  program_id: string | null;
  staff_user_id: string | null;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  effective_from: string;
  effective_until: string | null;
  is_blackout: boolean;
  notes: string | null;
  created_at: string;
};

export type AppointmentEventRow = {
  id: string;
  appointment_id: string;
  event_type: AppointmentEventType;
  previous_status: string | null;
  new_status: string | null;
  metadata: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
};

export type AppointmentEventType =
  | "created"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "no_show"
  | "reminder_sent"
  | "notes_updated";

// ---------------------------------------------------------------------------
// Service input types
// ---------------------------------------------------------------------------

export type CreateAppointmentInput = {
  case_id: string; // required — enforced at service AND DB level
  organization_id: string;
  program_id?: string | null;
  service_type: string;
  scheduled_start: string; // ISO 8601
  scheduled_end: string;   // ISO 8601
  timezone?: string;
  assigned_staff_id?: string | null;
  notes?: string | null;
};

export type RescheduleAppointmentInput = {
  scheduled_start: string;
  scheduled_end: string;
  timezone?: string;
  reason?: string | null;
};

export type UpdateReminderStateInput = {
  next_reminder_at: string | null;
  reminder_status?: string | null;
  last_reminded_at?: string | null;
};
