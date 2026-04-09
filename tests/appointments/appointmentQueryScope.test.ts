/**
 * Domain 4.2 — Appointment query scope tests (4 tests)
 *
 * Verifies that listAppointments routes to the correct repository function
 * and that scope boundaries are respected.
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

const cancelledAppointment: AppointmentRow = {
  ...mockAppointment,
  id: "appt-old",
  status: "cancelled",
};

vi.mock("@/lib/server/appointments/appointmentRepository", () => ({
  getAppointmentById: vi.fn(),
  listAppointmentsForApplicant: vi.fn(),
  listAppointmentsForProviderScope: vi.fn(),
  listAppointmentsForCase: vi.fn(),
  createAppointment: vi.fn(),
  updateAppointmentStatus: vi.fn(),
  updateAppointmentFields: vi.fn(),
  createRescheduledAppointment: vi.fn(),
  updateReminderState: vi.fn(),
  createAppointmentEvent: vi.fn(),
  getAvailabilityRulesForContext: vi.fn(),
  findConflictingAppointments: vi.fn(),
}));

vi.mock("@/lib/server/appointments/availabilityService", () => ({
  checkAppointmentConflicts: vi.fn(),
  resolveAvailabilityRules: vi.fn(),
  getAvailabilityForScheduling: vi.fn(),
}));

import { listAppointments } from "@/lib/server/appointments/appointmentService";
import * as repo from "@/lib/server/appointments/appointmentRepository";

const applicantCtx = {
  userId: "applicant-1",
  accountType: "applicant" as const,
  orgId: null,
} as Parameters<typeof listAppointments>[0]["ctx"];

const providerCtx = {
  userId: "user-1",
  accountType: "provider" as const,
  orgId: "org-a",
} as Parameters<typeof listAppointments>[0]["ctx"];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.listAppointmentsForApplicant).mockResolvedValue([mockAppointment]);
  vi.mocked(repo.listAppointmentsForProviderScope).mockResolvedValue([mockAppointment]);
  vi.mocked(repo.listAppointmentsForCase).mockResolvedValue([mockAppointment]);
});

describe("appointment query scope", () => {
  it("applicant scope routes to listAppointmentsForApplicant with own userId", async () => {
    await listAppointments({ ctx: applicantCtx, scope: "applicant" });
    expect(repo.listAppointmentsForApplicant).toHaveBeenCalledWith("applicant-1");
    expect(repo.listAppointmentsForProviderScope).not.toHaveBeenCalled();
  });

  it("provider scope routes to listAppointmentsForProviderScope with orgId", async () => {
    await listAppointments({ ctx: providerCtx, scope: "provider", organizationId: "org-a" });
    expect(repo.listAppointmentsForProviderScope).toHaveBeenCalledWith("org-a", expect.anything());
    expect(repo.listAppointmentsForApplicant).not.toHaveBeenCalled();
  });

  it("provider scope with case_id routes to listAppointmentsForCase", async () => {
    await listAppointments({ ctx: providerCtx, scope: "provider", caseId: "case-1" });
    expect(repo.listAppointmentsForCase).toHaveBeenCalledWith("case-1");
    expect(repo.listAppointmentsForProviderScope).not.toHaveBeenCalled();
  });

  it("historical cancelled/completed appointments are queryable — no status filter in provider scope", async () => {
    vi.mocked(repo.listAppointmentsForProviderScope).mockResolvedValue([
      mockAppointment,
      cancelledAppointment,
    ]);
    const results = await listAppointments({
      ctx: providerCtx,
      scope: "provider",
      organizationId: "org-a",
    });
    const statuses = results.map((r) => r.status);
    expect(statuses).toContain("scheduled");
    expect(statuses).toContain("cancelled");
  });
});
