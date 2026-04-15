/**
 * Domain 4.2 — Appointment service tests (7 tests)
 *
 * Tests service-layer behavior using mocked repository and availability service.
 * All DB calls are mocked via vi.mock().
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AppointmentRow } from "@/lib/server/appointments/appointmentTypes";

const mockAppointment: AppointmentRow = {
  id: "appt-1",
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
  getAppointmentById: vi.fn(),
  listAppointmentsForApplicant: vi.fn(),
  listAppointmentsForProviderScope: vi.fn(),
  listAppointmentsForCase: vi.fn(),
  insertAppointment: vi.fn(),
  updateAppointmentStatus: vi.fn(),
  updateAppointmentFields: vi.fn(),
  insertRescheduledAppointment: vi.fn(),
  updateReminderState: vi.fn(),
  insertAppointmentEvent: vi.fn(),
  getAvailabilityRulesForContext: vi.fn(),
  findConflictingAppointments: vi.fn(),
}));

vi.mock("@/lib/server/appointments/availabilityService", () => ({
  checkAppointmentConflicts: vi.fn(),
  resolveAvailabilityRules: vi.fn(),
  getAvailabilityForScheduling: vi.fn(),
}));

import {
  createAppointment,
  getAppointment,
  rescheduleAppointment,
  cancelAppointment,
  completeAppointment,
  updateReminderStateForAppointment,
} from "@/lib/server/appointments/appointmentService";
import * as repo from "@/lib/server/appointments/appointmentRepository";
import * as avail from "@/lib/server/appointments/availabilityService";

const ctx = {
  userId: "user-1",
  accountType: "provider" as const,
  orgId: "org-a",
} as Parameters<typeof createAppointment>[0]["ctx"];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.getAppointmentById).mockResolvedValue(mockAppointment);
  vi.mocked(repo.insertAppointment).mockResolvedValue(mockAppointment);
  vi.mocked(repo.insertAppointmentEvent).mockResolvedValue({} as never);
  vi.mocked(repo.updateAppointmentStatus).mockImplementation(({ toStatus }) =>
    Promise.resolve({ ...mockAppointment, status: toStatus } as AppointmentRow),
  );
  vi.mocked(repo.insertRescheduledAppointment).mockResolvedValue({
    ...mockAppointment,
    id: "appt-2",
    rescheduled_from_id: "appt-1",
    scheduled_start: "2026-05-02T10:00:00Z",
    scheduled_end: "2026-05-02T11:00:00Z",
    status: "scheduled",
  });
  vi.mocked(avail.checkAppointmentConflicts).mockResolvedValue(undefined);
});

describe("appointment service", () => {
  it("createAppointment validates case linkage, checks conflicts, then writes", async () => {
    await createAppointment({
      ctx,
      input: {
        case_id: "case-1",
        organization_id: "org-a",
        service_type: "intake_interview",
        scheduled_start: "2026-05-01T10:00:00Z",
        scheduled_end: "2026-05-01T11:00:00Z",
      },
    });
    // Conflict check must have been called BEFORE DB write
    expect(avail.checkAppointmentConflicts).toHaveBeenCalled();
    expect(repo.insertAppointment).toHaveBeenCalled();
    expect(repo.insertAppointmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "created" }),
    );
  });

  it("createAppointment without case_id throws VALIDATION_ERROR", async () => {
    await expect(
      createAppointment({
        ctx,
        input: {
          case_id: "", // empty — must reject
          organization_id: "org-a",
          service_type: "intake_interview",
          scheduled_start: "2026-05-01T10:00:00Z",
          scheduled_end: "2026-05-01T11:00:00Z",
        },
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    // Neither conflict check nor DB write should have been reached
    expect(avail.checkAppointmentConflicts).not.toHaveBeenCalled();
    expect(repo.insertAppointment).not.toHaveBeenCalled();
  });

  it("rescheduleAppointment sets rescheduled_from_id and writes history event", async () => {
    const result = await rescheduleAppointment({
      ctx,
      id: "appt-1",
      input: {
        scheduled_start: "2026-05-02T10:00:00Z",
        scheduled_end: "2026-05-02T11:00:00Z",
        reason: "Applicant requested change",
      },
    });
    expect(repo.insertRescheduledAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ originalId: "appt-1" }),
    );
    expect(result.rescheduled_from_id).toBe("appt-1");
    expect(repo.insertAppointmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "rescheduled", appointment_id: "appt-1" }),
    );
  });

  it("cancelAppointment accepts optional reason and writes history event", async () => {
    await cancelAppointment({ ctx, id: "appt-1", reason: "Staff unavailable" });
    expect(repo.updateAppointmentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "appt-1",
        fromStatus: "scheduled",
        toStatus: "cancelled",
        actorUserId: "user-1",
        actorAccountType: "provider",
        reason: "Staff unavailable",
      }),
    );
    expect(repo.insertAppointmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "cancelled",
        metadata: { reason: "Staff unavailable" },
      }),
    );
  });

  it("completeAppointment sets terminal completed state", async () => {
    const result = await completeAppointment({ ctx, id: "appt-1" });
    expect(result.status).toBe("completed");
    expect(repo.insertAppointmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "completed" }),
    );
  });

  it("getAppointment throws NOT_FOUND when appointment does not exist", async () => {
    vi.mocked(repo.getAppointmentById).mockResolvedValue(null);
    await expect(getAppointment({ ctx, id: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("updateReminderStateForAppointment updates next_reminder_at", async () => {
    vi.mocked(repo.updateReminderState).mockResolvedValue({
      ...mockAppointment,
      next_reminder_at: "2026-05-01T09:00:00Z",
    });
    const result = await updateReminderStateForAppointment({
      id: "appt-1",
      input: { next_reminder_at: "2026-05-01T09:00:00Z" },
    });
    expect(result.next_reminder_at).toBe("2026-05-01T09:00:00Z");
  });
});
