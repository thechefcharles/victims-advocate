/**
 * Domain 7.2 — Notification policy tests (6 tests)
 */

import { describe, it, expect, vi } from "vitest";
import { evalNotification } from "@/lib/server/notifications/notificationPolicy";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

function makeActor(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    userId: "user-1",
    accountType: "applicant",
    activeRole: null,
    tenantId: null,
    tenantType: null,
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
    ...overrides,
  };
}

function makeResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return { type: "notification", id: "n-1", ownerId: "user-1", ...overrides };
}

describe("notification policy", () => {
  it("applicant lists own notifications — ALLOW", async () => {
    const r = await evalNotification("notification:list", makeActor(), makeResource());
    expect(r.allowed).toBe(true);
  });

  it("applicant views another user's notification — DENY", async () => {
    const r = await evalNotification(
      "notification:view",
      makeActor({ userId: "user-1" }),
      makeResource({ ownerId: "user-2" }),
    );
    expect(r.allowed).toBe(false);
  });

  it("provider views own workflow notifications — ALLOW", async () => {
    const r = await evalNotification(
      "notification:list",
      makeActor({ accountType: "provider", activeRole: "org_owner", tenantId: "org-a", tenantType: "provider" }),
      makeResource({ ownerId: "user-1" }),
    );
    expect(r.allowed).toBe(true);
  });

  it("agency views own scoped notifications — ALLOW", async () => {
    const r = await evalNotification(
      "notification:view",
      makeActor({ accountType: "agency", activeRole: "program_officer", tenantType: "agency" }),
      makeResource({ ownerId: "user-1" }),
    );
    expect(r.allowed).toBe(true);
  });

  it("admin support-mode inspection — ALLOW with audit", async () => {
    const r = await evalNotification(
      "notification:view",
      makeActor({ isAdmin: true, accountType: "provider", tenantType: "platform" }),
      makeResource({ ownerId: "other-user" }),
    );
    expect(r.allowed).toBe(true);
    expect(r.auditRequired).toBe(true);
  });

  it("preference update by non-owner — DENY", async () => {
    const r = await evalNotification(
      "notification:preference.update",
      makeActor({ userId: "user-1" }),
      { type: "notification_preference", id: null, ownerId: "user-2" },
    );
    expect(r.allowed).toBe(false);
  });
});
