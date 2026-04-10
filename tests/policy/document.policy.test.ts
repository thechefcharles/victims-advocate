/**
 * Domain 1.4 — Document policy tests.
 *
 * Covers the 10 security categories from CODING_CONTEXT.md:
 *  1. Unauthenticated / missing actor
 *  2. Cross-tenant denial
 *  3. Assignment / ownership denial
 *  6. Secure resource access (status gate: locked/archived)
 *  8. Audit on deny (auditRequired = true)
 * 10. Admin bypass
 * Plus: document:download, document:replace, document:lock, document:share consent gate.
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

function makeDocResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "document",
    id: "doc-1",
    ownerId: "applicant-user",
    tenantId: "org-123",
    status: "active",
    assignedTo: "user-actor",
    ...overrides,
  };
}

beforeEach(() => { vi.clearAllMocks(); });

// ---------------------------------------------------------------------------
// Category 1 — Unauthenticated
// ---------------------------------------------------------------------------

describe("Category 1: Unauthenticated denied", () => {
  it("document:upload denied when userId is empty", async () => {
    const d = await can("document:upload", makeActor({ userId: "" }), makeDocResource());
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("UNAUTHENTICATED");
  });

  it("document:download denied when userId is empty", async () => {
    const d = await can("document:download", makeActor({ userId: "" }), makeDocResource());
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("UNAUTHENTICATED");
  });
});

// ---------------------------------------------------------------------------
// Category 2 — Cross-tenant denial
// ---------------------------------------------------------------------------

describe("Category 2: Cross-tenant denial", () => {
  it("document:view denied when actor.tenantId !== resource.tenantId", async () => {
    const d = await can("document:view", makeActor({ tenantId: "org-other" }), makeDocResource({ tenantId: "org-123" }));
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("TENANT_SCOPE_MISMATCH");
  });
});

// ---------------------------------------------------------------------------
// Category 3 — Assignment / ownership denial
// ---------------------------------------------------------------------------

describe("Category 3: Advocate assignment scope", () => {
  it("document:view denied for victim_advocate not assigned to case", async () => {
    const d = await can(
      "document:view",
      makeActor({ activeRole: "victim_advocate", userId: "adv-a" }),
      makeDocResource({ assignedTo: "adv-b" }),
    );
    expect(d.allowed).toBe(false);
  });

  it("document:view allowed for victim_advocate assigned to case", async () => {
    const d = await can(
      "document:view",
      makeActor({ activeRole: "victim_advocate", userId: "adv-a" }),
      makeDocResource({ assignedTo: "adv-a" }),
    );
    expect(d.allowed).toBe(true);
  });

  it("applicant denied when ownerId does not match", async () => {
    const d = await can(
      "document:view",
      makeActor({ accountType: "applicant", activeRole: null, tenantId: null, tenantType: null, userId: "other-user" }),
      makeDocResource({ ownerId: "applicant-user", tenantId: null }),
    );
    expect(d.allowed).toBe(false);
  });

  it("applicant allowed when ownerId matches", async () => {
    const d = await can(
      "document:view",
      makeActor({ accountType: "applicant", activeRole: null, tenantId: null, tenantType: null, userId: "applicant-user" }),
      makeDocResource({ ownerId: "applicant-user", tenantId: null }),
    );
    expect(d.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Category 6 — Status gate (locked / archived)
// ---------------------------------------------------------------------------

describe("Category 6: Document status gate", () => {
  it("document:replace denied when status is locked", async () => {
    const d = await can("document:replace", makeActor(), makeDocResource({ status: "locked" }));
    expect(d.allowed).toBe(false);
  });

  it("document:replace denied when status is archived", async () => {
    const d = await can("document:replace", makeActor(), makeDocResource({ status: "archived" }));
    expect(d.allowed).toBe(false);
  });

  it("document:replace allowed when status is active", async () => {
    const d = await can("document:replace", makeActor(), makeDocResource({ status: "active" }));
    expect(d.allowed).toBe(true);
  });

  it("document:lock denied when already locked", async () => {
    const d = await can("document:lock", makeActor(), makeDocResource({ status: "locked" }));
    expect(d.allowed).toBe(false);
  });

  it("document:lock denied when archived", async () => {
    const d = await can("document:lock", makeActor(), makeDocResource({ status: "archived" }));
    expect(d.allowed).toBe(false);
  });

  it("document:lock allowed when active (CASE_LEADERSHIP)", async () => {
    const d = await can("document:lock", makeActor({ activeRole: "supervisor" }), makeDocResource({ status: "active" }));
    expect(d.allowed).toBe(true);
  });

  it("document:lock denied for victim_advocate (not CASE_LEADERSHIP)", async () => {
    const d = await can("document:lock", makeActor({ activeRole: "victim_advocate" }), makeDocResource({ status: "active" }));
    expect(d.allowed).toBe(false);
  });

  it("document:share denied when status is archived", async () => {
    const d = await can("document:share", makeActor(), makeDocResource({ status: "archived" }));
    expect(d.allowed).toBe(false);
  });

  it("document:delete denied when status is locked", async () => {
    const d = await can("document:delete", makeActor(), makeDocResource({ status: "locked" }));
    expect(d.allowed).toBe(false);
  });

  it("document:download denied when status is archived", async () => {
    const d = await can("document:download", makeActor(), makeDocResource({ status: "archived" }));
    expect(d.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Category 8 — Audit on DENY
// ---------------------------------------------------------------------------

describe("Category 8: Denials set auditRequired = true", () => {
  it("denied document:view returns auditRequired = true", async () => {
    const d = await can("document:view", makeActor({ userId: "" }), makeDocResource());
    expect(d.auditRequired).toBe(true);
  });

  it("denied document:lock returns auditRequired = true", async () => {
    const d = await can("document:lock", makeActor({ activeRole: "victim_advocate" }), makeDocResource());
    expect(d.auditRequired).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Category 10 — Admin bypass
// ---------------------------------------------------------------------------

describe("Category 10: Admin bypass", () => {
  it("admin can download an archived document", async () => {
    const d = await can(
      "document:download",
      makeActor({ isAdmin: true, accountType: "platform_admin" as any }),
      makeDocResource({ status: "archived" }),
    );
    expect(d.allowed).toBe(true);
    expect(d.auditRequired).toBe(true);
  });

  it("admin can lock any document", async () => {
    const d = await can(
      "document:lock",
      makeActor({ isAdmin: true, accountType: "platform_admin" as any }),
      makeDocResource({ status: "active" }),
    );
    expect(d.allowed).toBe(true);
  });
});
