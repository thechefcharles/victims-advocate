/**
 * Domain 4.2 — Appointment state machine tests (7 tests)
 *
 * Tests validateAppointmentTransition() — pure function, no DB required.
 */

import { describe, it, expect } from "vitest";
import { validateAppointmentTransition } from "@/lib/server/appointments/appointmentStateMachine";

describe("appointment state machine — validateAppointmentTransition", () => {
  it("scheduled → rescheduled is valid", () => {
    expect(() => validateAppointmentTransition("scheduled", "rescheduled")).not.toThrow();
  });

  it("scheduled → cancelled is valid", () => {
    expect(() => validateAppointmentTransition("scheduled", "cancelled")).not.toThrow();
  });

  it("scheduled → completed is valid", () => {
    expect(() => validateAppointmentTransition("scheduled", "completed")).not.toThrow();
  });

  it("scheduled → no_show is valid", () => {
    expect(() => validateAppointmentTransition("scheduled", "no_show")).not.toThrow();
  });

  it("rescheduled → cancelled is valid", () => {
    expect(() => validateAppointmentTransition("rescheduled", "cancelled")).not.toThrow();
  });

  it("cancelled → any state is invalid (terminal)", () => {
    expect(() => validateAppointmentTransition("cancelled", "scheduled")).toThrow();
    expect(() => validateAppointmentTransition("cancelled", "rescheduled")).toThrow();
  });

  it("completed → any state is invalid (terminal)", () => {
    expect(() => validateAppointmentTransition("completed", "scheduled")).toThrow();
    expect(() => validateAppointmentTransition("completed", "rescheduled")).toThrow();
  });
});
