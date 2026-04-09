/**
 * Domain 4.2 — Appointment policy tests (6 tests)
 *
 * Tests evalAppointment() directly. No DB required.
 */

import { describe, it, expect } from "vitest";
import { evalAppointment } from "@/lib/server/appointments/appointmentPolicy";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";

function makeActor(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    userId: "user-1",
    accountType: "provider",
    activeRole: "victim_advocate",
    tenantId: "org-a",
    tenantType: "provider",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
    ...overrides,
  };
}

describe("appointment policy", () => {
  it("applicant views own case-linked appointment — ALLOW", async () => {
    const actor = makeActor({ accountType: "applicant", activeRole: null, tenantId: null, tenantType: null });
    const resource = { type: "appointment" as const, id: "appt-1", ownerId: "user-1" };
    const result = await evalAppointment("appointment:view", actor, resource);
    expect(result.allowed).toBe(true);
  });

  it("applicant views appointment belonging to another user — DENY", async () => {
    const actor = makeActor({ accountType: "applicant", activeRole: null, tenantId: null, tenantType: null });
    const resource = { type: "appointment" as const, id: "appt-2", ownerId: "other-user" };
    const result = await evalAppointment("appointment:view", actor, resource);
    expect(result.allowed).toBe(false);
  });

  it("provider victim_advocate in org creates appointment — ALLOW", async () => {
    const actor = makeActor({ activeRole: "victim_advocate", tenantId: "org-a" });
    const resource = { type: "appointment" as const, id: null, tenantId: "org-a" };
    const result = await evalAppointment("appointment:create", actor, resource);
    expect(result.allowed).toBe(true);
  });

  it("provider from different org creates appointment — DENY", async () => {
    const actor = makeActor({ activeRole: "org_owner", tenantId: "org-b" });
    const resource = { type: "appointment" as const, id: null, tenantId: "org-a" };
    const result = await evalAppointment("appointment:create", actor, resource);
    expect(result.allowed).toBe(false);
  });

  it("agency account type — DENY on appointment:list", async () => {
    const actor = makeActor({ accountType: "agency", activeRole: null, tenantType: "agency" });
    const resource = { type: "appointment" as const, id: null };
    const result = await evalAppointment("appointment:list", actor, resource);
    expect(result.allowed).toBe(false);
  });

  it("platform admin — ALLOW on any appointment action", async () => {
    const actor = makeActor({ isAdmin: true, accountType: "provider" });
    const resource = { type: "appointment" as const, id: "appt-1" };
    const result = await evalAppointment("appointment:complete", actor, resource);
    expect(result.allowed).toBe(true);
  });
});
