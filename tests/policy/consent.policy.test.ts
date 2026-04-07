/**
 * Domain 1.4 — Consent policy tests.
 *
 * Covers:
 *  1. Unauthenticated denied
 *  2. Agency explicit denial
 *  3. consent:create — applicant only
 *  4. consent:revoke — applicant owner only
 *  5. consent:view — applicant (own), provider CASE_STAFF
 *  6. consent:view — denied for provider with no role
 *  7. consent:request — provider CASE_STAFF allowed
 *  8. consent:request — applicant denied
 *  9. consent:create — non-owner applicant?  (ownerId not checked for create)
 * 10. Admin bypass
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { can } from "@/lib/server/policy/policyEngine";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

function makeActor(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    userId: "user-actor",
    accountType: "provider",
    activeRole: "supervisor",
    tenantId: "org-123",
    tenantType: "provider",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
    ...overrides,
  };
}

function makeConsentResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "consent",
    id: "grant-1",
    ownerId: "applicant-user",
    tenantId: null,
    status: "active",
    ...overrides,
  };
}

beforeEach(() => { vi.clearAllMocks(); });

describe("Unauthenticated denied", () => {
  it("consent:create denied when userId is empty", async () => {
    const d = await can("consent:create", makeActor({ userId: "" }), makeConsentResource());
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("UNAUTHENTICATED");
  });
});

describe("Agency explicit denial", () => {
  it("consent:create denied for agency account", async () => {
    const d = await can(
      "consent:create",
      makeActor({ tenantType: "agency" }),
      makeConsentResource(),
    );
    expect(d.allowed).toBe(false);
  });

  it("consent:revoke denied for agency account", async () => {
    const d = await can(
      "consent:revoke",
      makeActor({ tenantType: "agency" }),
      makeConsentResource(),
    );
    expect(d.allowed).toBe(false);
  });
});

describe("consent:create — applicant only", () => {
  it("applicant can create a consent grant", async () => {
    const d = await can(
      "consent:create",
      makeActor({ accountType: "applicant", activeRole: null, tenantId: null, tenantType: null, userId: "applicant-user" }),
      makeConsentResource({ ownerId: "applicant-user", tenantId: null }),
    );
    expect(d.allowed).toBe(true);
  });

  it("provider cannot create a consent grant", async () => {
    const d = await can("consent:create", makeActor(), makeConsentResource());
    expect(d.allowed).toBe(false);
  });
});

describe("consent:revoke — applicant owner only", () => {
  it("applicant owner can revoke their own grant", async () => {
    const d = await can(
      "consent:revoke",
      makeActor({ accountType: "applicant", activeRole: null, tenantId: null, tenantType: null, userId: "applicant-user" }),
      makeConsentResource({ ownerId: "applicant-user", tenantId: null }),
    );
    expect(d.allowed).toBe(true);
  });

  it("applicant cannot revoke another applicant's grant", async () => {
    const d = await can(
      "consent:revoke",
      makeActor({ accountType: "applicant", activeRole: null, tenantId: null, tenantType: null, userId: "other-applicant" }),
      makeConsentResource({ ownerId: "applicant-user", tenantId: null }),
    );
    expect(d.allowed).toBe(false);
  });

  it("provider cannot revoke a consent grant", async () => {
    const d = await can("consent:revoke", makeActor(), makeConsentResource());
    expect(d.allowed).toBe(false);
  });
});

describe("consent:view — access control", () => {
  it("applicant owner can view their grant", async () => {
    const d = await can(
      "consent:view",
      makeActor({ accountType: "applicant", activeRole: null, tenantId: null, tenantType: null, userId: "applicant-user" }),
      makeConsentResource({ ownerId: "applicant-user", tenantId: null }),
    );
    expect(d.allowed).toBe(true);
  });

  it("provider CASE_STAFF can view consent grants", async () => {
    const d = await can("consent:view", makeActor({ activeRole: "supervisor" }), makeConsentResource());
    expect(d.allowed).toBe(true);
  });

  it("provider with no role cannot view consent grants", async () => {
    const d = await can("consent:view", makeActor({ activeRole: null }), makeConsentResource());
    expect(d.allowed).toBe(false);
  });
});

describe("consent:request — provider CASE_STAFF", () => {
  it("supervisor can request consent", async () => {
    const d = await can("consent:request", makeActor({ activeRole: "supervisor" }), makeConsentResource());
    expect(d.allowed).toBe(true);
  });

  it("victim_advocate can request consent", async () => {
    const d = await can("consent:request", makeActor({ activeRole: "victim_advocate" }), makeConsentResource());
    expect(d.allowed).toBe(true);
  });

  it("applicant cannot request consent", async () => {
    const d = await can(
      "consent:request",
      makeActor({ accountType: "applicant", activeRole: null, tenantId: null, tenantType: null }),
      makeConsentResource(),
    );
    expect(d.allowed).toBe(false);
  });
});

describe("Admin bypass", () => {
  it("admin can view any consent grant", async () => {
    const d = await can(
      "consent:view",
      makeActor({ isAdmin: true, accountType: "platform_admin" as any }),
      makeConsentResource(),
    );
    expect(d.allowed).toBe(true);
    expect(d.auditRequired).toBe(true);
  });
});
