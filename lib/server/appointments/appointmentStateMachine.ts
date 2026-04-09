/**
 * Domain 4.2 — Appointment state machine.
 *
 * Pure function — no DB access.
 * Terminal states: cancelled, completed, no_show.
 */

import { AppError } from "@/lib/server/api";
import type { AppointmentStatus } from "./appointmentTypes";

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled:   ["rescheduled", "cancelled", "completed", "no_show"],
  rescheduled: ["rescheduled", "cancelled", "completed", "no_show"],
  cancelled:   [],
  completed:   [],
  no_show:     [],
};

/**
 * Throws AppError(VALIDATION_ERROR) if the transition is not allowed.
 * Safe to call inline — no side effects.
 */
export function validateAppointmentTransition(
  current: AppointmentStatus,
  next: AppointmentStatus,
): void {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Unknown appointment status: '${current}'.`,
      undefined,
      422,
    );
  }
  if (!allowed.includes(next)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Appointment cannot transition from '${current}' to '${next}'.`,
      undefined,
      422,
    );
  }
}
