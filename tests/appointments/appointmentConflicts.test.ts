/**
 * Domain 4.2 — Appointment conflict detection tests (4 tests)
 *
 * Tests checkAppointmentConflicts() — the gate that runs BEFORE any DB write.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AppointmentRow } from "@/lib/server/appointments/appointmentTypes";

const conflictingAppointment: AppointmentRow = {
  id: "appt-conflict",
  case_id: "case-1",
  organization_id: "org-a",
  program_id: null,
  service_type: "intake_interview",
  scheduled_start: "2026-05-01T10:00:00Z",
  scheduled_end: "2026-05-01T11:00:00Z",
  timezone: "UTC",
  status: "scheduled",
  assigned_staff_id: "staff-1",
  notes: null,
  rescheduled_from_id: null,
  next_reminder_at: null,
  reminder_status: null,
  last_reminded_at: null,
  created_by: "user-1",
  created_at: "2026-04-09T00:00:00Z",
  updated_at: "2026-04-09T00:00:00Z",
};

vi.mock("@/lib/server/appointments/appointmentRepository", () => ({
  findConflictingAppointments: vi.fn(),
  getAvailabilityRulesForContext: vi.fn(),
}));

import { checkAppointmentConflicts } from "@/lib/server/appointments/availabilityService";
import * as repo from "@/lib/server/appointments/appointmentRepository";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("appointment conflict detection", () => {
  it("no conflict — resolves without throwing", async () => {
    vi.mocked(repo.findConflictingAppointments).mockResolvedValue([]);
    await expect(
      checkAppointmentConflicts({
        organizationId: "org-a",
        staffUserId: "staff-1",
        scheduledStart: "2026-05-01T10:00:00Z",
        scheduledEnd: "2026-05-01T11:00:00Z",
      }),
    ).resolves.toBeUndefined();
  });

  it("conflict exists — throws CONFLICT error before any DB write", async () => {
    vi.mocked(repo.findConflictingAppointments).mockResolvedValue([conflictingAppointment]);
    await expect(
      checkAppointmentConflicts({
        organizationId: "org-a",
        staffUserId: "staff-1",
        scheduledStart: "2026-05-01T10:30:00Z",
        scheduledEnd: "2026-05-01T11:30:00Z",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("excludeId prevents self-conflict during reschedule", async () => {
    // findConflictingAppointments receives excludeId — mock returns empty (excluded)
    vi.mocked(repo.findConflictingAppointments).mockResolvedValue([]);
    await expect(
      checkAppointmentConflicts({
        organizationId: "org-a",
        staffUserId: "staff-1",
        scheduledStart: "2026-05-01T10:00:00Z",
        scheduledEnd: "2026-05-01T11:00:00Z",
        excludeId: "appt-conflict",
      }),
    ).resolves.toBeUndefined();
    expect(repo.findConflictingAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ excludeId: "appt-conflict" }),
    );
  });

  it("conflict check passes excludeId to repository — allows same slot update", async () => {
    vi.mocked(repo.findConflictingAppointments).mockResolvedValue([]);
    await checkAppointmentConflicts({
      organizationId: "org-a",
      staffUserId: "staff-1",
      scheduledStart: "2026-05-01T10:00:00Z",
      scheduledEnd: "2026-05-01T11:00:00Z",
      excludeId: "appt-1",
    });
    expect(repo.findConflictingAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ excludeId: "appt-1" }),
    );
  });
});
