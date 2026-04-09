/**
 * Domain 4.2 — Availability service.
 *
 * resolveAvailabilityRules() — fetch org/staff/program windows.
 * checkAppointmentConflicts() — MUST be called BEFORE any DB write.
 *   Returns the conflicting appointment ID if a conflict exists, or null.
 */

import { AppError } from "@/lib/server/api";
import type { AvailabilityRuleRow } from "./appointmentTypes";
import {
  getAvailabilityRulesForContext,
  findConflictingAppointments,
} from "./appointmentRepository";

export async function resolveAvailabilityRules(params: {
  organizationId: string;
  staffUserId?: string | null;
  programId?: string | null;
}): Promise<AvailabilityRuleRow[]> {
  return getAvailabilityRulesForContext(params);
}

/**
 * Check for overlapping active appointments. Must be called before the DB
 * insert/update in every scheduling path. Throws CONFLICT error if overlap found.
 *
 * @param excludeId — pass original appointment ID when rescheduling to exclude self.
 */
export async function checkAppointmentConflicts(params: {
  organizationId: string;
  staffUserId?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  excludeId?: string;
}): Promise<void> {
  const conflicts = await findConflictingAppointments({
    organizationId: params.organizationId,
    staffUserId: params.staffUserId,
    scheduledStart: params.scheduledStart,
    scheduledEnd: params.scheduledEnd,
    excludeId: params.excludeId,
  });

  if (conflicts.length > 0) {
    throw new AppError(
      "CONFLICT",
      `Scheduling conflict: staff member already has an appointment during this time window (id: ${conflicts[0].id}).`,
      { conflicting_id: conflicts[0].id },
      409,
    );
  }
}

/**
 * Return availability windows for a given date range, respecting blackout rules.
 * Returns the raw availability rules — consumers format these for UI/calendar use.
 */
export async function getAvailabilityForScheduling(params: {
  organizationId: string;
  staffUserId?: string | null;
  programId?: string | null;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}): Promise<AvailabilityRuleRow[]> {
  const rules = await resolveAvailabilityRules({
    organizationId: params.organizationId,
    staffUserId: params.staffUserId,
    programId: params.programId,
  });

  if (!params.dateRangeStart && !params.dateRangeEnd) {
    return rules;
  }

  // Filter to rules that overlap with the requested date range
  return rules.filter((rule) => {
    if (params.dateRangeEnd && rule.effective_from > params.dateRangeEnd) return false;
    if (params.dateRangeStart && rule.effective_until && rule.effective_until < params.dateRangeStart) return false;
    return true;
  });
}
