/**
 * Domain 4.2 — Appointment serializer tests (4 tests)
 *
 * Tests that each serializer exposes only the correct fields.
 */

import { describe, it, expect } from "vitest";
import {
  serializeForApplicant,
  serializeForProvider,
  serializeForProviderList,
  serializeForAdmin,
} from "@/lib/server/appointments/appointmentSerializer";
import type { AppointmentRow } from "@/lib/server/appointments/appointmentTypes";

const mockRow: AppointmentRow = {
  id: "appt-1",
  case_id: "case-1",
  organization_id: "org-a",
  program_id: "prog-1",
  service_type: "intake_interview",
  scheduled_start: "2026-05-01T10:00:00Z",
  scheduled_end: "2026-05-01T11:00:00Z",
  timezone: "America/Chicago",
  status: "scheduled",
  assigned_staff_id: "staff-1",
  notes: "Provider internal note — do not share",
  rescheduled_from_id: "appt-0",
  next_reminder_at: "2026-05-01T09:00:00Z",
  reminder_status: "pending",
  last_reminded_at: null,
  created_by: "user-1",
  created_at: "2026-04-09T00:00:00Z",
  updated_at: "2026-04-09T00:00:00Z",
};

describe("appointment serializer", () => {
  it("applicant serializer strips all provider-internal details", () => {
    const view = serializeForApplicant(mockRow);
    expect(view.id).toBe("appt-1");
    expect(view.status).toBe("scheduled");
    expect(view.scheduled_start).toBe("2026-05-01T10:00:00Z");
    // Provider-internal fields must not be present
    expect((view as Record<string, unknown>).case_id).toBeUndefined();
    expect((view as Record<string, unknown>).organization_id).toBeUndefined();
    expect((view as Record<string, unknown>).assigned_staff_id).toBeUndefined();
    expect((view as Record<string, unknown>).notes).toBeUndefined();
    expect((view as Record<string, unknown>).rescheduled_from_id).toBeUndefined();
    expect((view as Record<string, unknown>).reminder_status).toBeUndefined();
  });

  it("provider serializer includes full operational detail", () => {
    const view = serializeForProvider(mockRow);
    expect(view.case_id).toBe("case-1");
    expect(view.organization_id).toBe("org-a");
    expect(view.assigned_staff_id).toBe("staff-1");
    expect(view.notes).toBe("Provider internal note — do not share");
    expect(view.rescheduled_from_id).toBe("appt-0");
    expect(view.reminder_status).toBe("pending");
  });

  it("admin serializer returns full AppointmentRow", () => {
    const view = serializeForAdmin(mockRow);
    expect(view.case_id).toBe("case-1");
    expect(view.notes).toBe("Provider internal note — do not share");
    expect(view.reminder_status).toBe("pending");
    expect(view.created_by).toBe("user-1");
  });

  it("provider list serializer omits notes and reminder detail", () => {
    const view = serializeForProviderList(mockRow);
    expect(view.id).toBe("appt-1");
    expect(view.case_id).toBe("case-1");
    expect(view.assigned_staff_id).toBe("staff-1");
    expect((view as Record<string, unknown>).notes).toBeUndefined();
    expect((view as Record<string, unknown>).reminder_status).toBeUndefined();
    expect((view as Record<string, unknown>).organization_id).toBeUndefined();
  });
});
