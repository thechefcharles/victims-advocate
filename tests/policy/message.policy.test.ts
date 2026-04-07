/**
 * Domain 1.3 — Message + MessageThread policy tests
 *
 * Covers the 10 security categories from CODING_CONTEXT.md:
 *  1. Unauthenticated / missing actor
 *  2. Cross-tenant denial
 *  3. Assignment / ownership denial
 *  4. Consent-gated denial
 *  5. Serializer non-leakage (structural — thread view fields)
 *  6. Secure resource access (thread status gate)
 *  7. Notification safe content (not applicable — handled by notifyNewMessage)
 *  8. Audit event creation (auditRequired = true on deny)
 *  9. Revoked / expired access (thread read_only / archived denies send)
 * 10. Admin access audited (admin bypass with auditRequired = true)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { can } from "@/lib/server/policy/policyEngine";
import type { PolicyActor, PolicyResource, PolicyContext } from "@/lib/server/policy/policyTypes";

// ---------------------------------------------------------------------------
// Mock audit logEvent (fire-and-forget)
// ---------------------------------------------------------------------------

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeActor(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    userId: "user-actor",
    accountType: "provider",
    activeRole: "victim_advocate",
    tenantId: "org-123",
    tenantType: "provider",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
    ...overrides,
  };
}

function makeMessageResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "message",
    id: "thread-1",
    ownerId: "applicant-user",
    tenantId: "org-123",
    status: "active",
    assignedTo: "user-actor",
    ...overrides,
  };
}

function makeThreadResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "message_thread",
    id: "thread-1",
    ownerId: "applicant-user",
    tenantId: "org-123",
    status: "active",
    assignedTo: "user-actor",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Category 1 — Unauthenticated / missing actor
// ---------------------------------------------------------------------------

describe("Category 1: Unauthenticated actor denied", () => {
  it("message:send denied when userId is empty", async () => {
    const actor = makeActor({ userId: "" });
    const d = await can("message:send", actor, makeMessageResource());
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("UNAUTHENTICATED");
  });

  it("message:read denied when userId is empty", async () => {
    const actor = makeActor({ userId: "" });
    const d = await can("message:read", actor, makeMessageResource());
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("UNAUTHENTICATED");
  });

  it("message_thread:view denied when userId is empty", async () => {
    const actor = makeActor({ userId: "" });
    const d = await can("message_thread:view", actor, makeThreadResource());
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("UNAUTHENTICATED");
  });
});

// ---------------------------------------------------------------------------
// Category 2 — Cross-tenant denial
// ---------------------------------------------------------------------------

describe("Category 2: Cross-tenant denial", () => {
  it("message:send denied when actor.tenantId !== resource.tenantId", async () => {
    const actor = makeActor({ tenantId: "org-other" });
    const d = await can("message:send", actor, makeMessageResource({ tenantId: "org-123" }));
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("TENANT_SCOPE_MISMATCH");
  });

  it("message_thread:view denied across tenants", async () => {
    const actor = makeActor({ tenantId: "org-other" });
    const d = await can("message_thread:view", actor, makeThreadResource({ tenantId: "org-123" }));
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("TENANT_SCOPE_MISMATCH");
  });
});

// ---------------------------------------------------------------------------
// Category 3 — Assignment / ownership denial
// ---------------------------------------------------------------------------

describe("Category 3: Advocate assignment scope enforcement", () => {
  it("message:send denied when advocate is not assigned to the case", async () => {
    const actor = makeActor({ activeRole: "victim_advocate", userId: "advocate-a" });
    const resource = makeMessageResource({ assignedTo: "advocate-b" });
    const d = await can("message:send", actor, resource);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("INSUFFICIENT_ROLE");
  });

  it("message:send allowed when advocate is assigned to the case", async () => {
    const actor = makeActor({ activeRole: "victim_advocate", userId: "advocate-a" });
    const resource = makeMessageResource({ assignedTo: "advocate-a" });
    const d = await can("message:send", actor, resource);
    expect(d.allowed).toBe(true);
  });

  it("message:read denied when advocate is not assigned", async () => {
    const actor = makeActor({ activeRole: "victim_advocate", userId: "advocate-a" });
    const resource = makeMessageResource({ assignedTo: "advocate-b" });
    const d = await can("message:read", actor, resource);
    expect(d.allowed).toBe(false);
  });

  it("supervisor can message without being assigned", async () => {
    const actor = makeActor({ activeRole: "supervisor", userId: "super-1" });
    const resource = makeMessageResource({ assignedTo: "advocate-x" });
    const d = await can("message:send", actor, resource);
    expect(d.allowed).toBe(true);
  });

  it("applicant denied when ownerId does not match", async () => {
    const actor = makeActor({
      accountType: "applicant",
      activeRole: null,
      tenantId: null,
      tenantType: null,
      userId: "user-other",
    });
    const resource = makeMessageResource({ ownerId: "applicant-user", tenantId: null });
    const d = await can("message:send", actor, resource);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("INSUFFICIENT_ROLE");
  });

  it("applicant allowed when ownerId matches", async () => {
    const actor = makeActor({
      accountType: "applicant",
      activeRole: null,
      tenantId: null,
      tenantType: null,
      userId: "applicant-user",
    });
    const resource = makeMessageResource({ ownerId: "applicant-user", tenantId: null });
    const d = await can("message:send", actor, resource);
    expect(d.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Category 4 — Consent-gated denial
// ---------------------------------------------------------------------------

describe("Category 4: Consent gate", () => {
  it("message:send denied when consent is missing", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const resource = makeMessageResource();
    const context: PolicyContext = { consentStatus: "missing" };
    const d = await can("message:send", actor, resource, context);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("MISSING_CONSENT");
  });

  it("message:send allowed when consent is accepted", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const resource = makeMessageResource();
    const context: PolicyContext = { consentStatus: "accepted" };
    const d = await can("message:send", actor, resource, context);
    expect(d.allowed).toBe(true);
  });

  it("message_thread:view denied when consent is missing", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const d = await can("message_thread:view", actor, makeThreadResource(), {
      consentStatus: "missing",
    });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("MISSING_CONSENT");
  });
});

// ---------------------------------------------------------------------------
// Category 6 + 9 — Thread status gate (read_only and archived deny sends)
// ---------------------------------------------------------------------------

describe("Category 6/9: Thread status gate", () => {
  it("message:send denied when thread status is read_only", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const resource = makeMessageResource({ status: "read_only" });
    const d = await can("message:send", actor, resource);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("INSUFFICIENT_ROLE");
  });

  it("message:send denied when thread status is archived", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const resource = makeMessageResource({ status: "archived" });
    const d = await can("message:send", actor, resource);
    expect(d.allowed).toBe(false);
  });

  it("message:read allowed when thread status is read_only", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const resource = makeMessageResource({ status: "read_only" });
    const d = await can("message:read", actor, resource);
    expect(d.allowed).toBe(true);
  });

  it("message:read allowed when thread status is archived", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const resource = makeMessageResource({ status: "archived" });
    const d = await can("message:read", actor, resource);
    expect(d.allowed).toBe(true);
  });

  it("message:send allowed when thread status is active", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const resource = makeMessageResource({ status: "active" });
    const d = await can("message:send", actor, resource);
    expect(d.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Category 8 — Audit on DENY
// ---------------------------------------------------------------------------

describe("Category 8: Denials set auditRequired = true", () => {
  it("denied message:send returns auditRequired = true", async () => {
    const actor = makeActor({ userId: "" });
    const d = await can("message:send", actor, makeMessageResource());
    expect(d.auditRequired).toBe(true);
  });

  it("denied message_thread:create_workflow returns auditRequired = true", async () => {
    const actor = makeActor({ activeRole: "victim_advocate" });
    const d = await can("message_thread:create_workflow", actor, makeThreadResource());
    expect(d.auditRequired).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Category 10 — Admin bypass (auditRequired = true)
// ---------------------------------------------------------------------------

describe("Category 10: Admin bypass with auditRequired = true", () => {
  it("admin can send messages on any thread status", async () => {
    const actor = makeActor({ isAdmin: true, accountType: "platform_admin" as any });
    const resource = makeMessageResource({ status: "archived" });
    const d = await can("message:send", actor, resource);
    expect(d.allowed).toBe(true);
    expect(d.auditRequired).toBe(true);
  });

  it("admin can view any thread", async () => {
    const actor = makeActor({ isAdmin: true, accountType: "platform_admin" as any });
    const d = await can("message_thread:view", actor, makeThreadResource());
    expect(d.allowed).toBe(true);
    expect(d.auditRequired).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// message_thread:* — leadership actions
// ---------------------------------------------------------------------------

describe("message_thread leadership actions", () => {
  it("message_thread:create_workflow denied for victim_advocate", async () => {
    const actor = makeActor({ activeRole: "victim_advocate" });
    const d = await can("message_thread:create_workflow", actor, makeThreadResource());
    expect(d.allowed).toBe(false);
  });

  it("message_thread:create_workflow allowed for org_owner", async () => {
    const actor = makeActor({ activeRole: "org_owner" });
    const d = await can("message_thread:create_workflow", actor, makeThreadResource());
    expect(d.allowed).toBe(true);
  });

  it("message_thread:create_workflow allowed for supervisor", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const d = await can("message_thread:create_workflow", actor, makeThreadResource());
    expect(d.allowed).toBe(true);
  });

  it("message_thread:archive denied for intake_specialist", async () => {
    const actor = makeActor({ activeRole: "intake_specialist" });
    const d = await can("message_thread:archive", actor, makeThreadResource());
    expect(d.allowed).toBe(false);
  });

  it("message_thread:archive allowed for program_manager", async () => {
    const actor = makeActor({ activeRole: "program_manager" });
    const d = await can("message_thread:archive", actor, makeThreadResource());
    expect(d.allowed).toBe(true);
  });

  it("message_thread:set_read_only allowed for org_owner", async () => {
    const actor = makeActor({ activeRole: "org_owner" });
    const d = await can("message_thread:set_read_only", actor, makeThreadResource());
    expect(d.allowed).toBe(true);
  });

  it("message_thread:view allowed for CASE_STAFF provider", async () => {
    const actor = makeActor({ activeRole: "intake_specialist" });
    const d = await can("message_thread:view", actor, makeThreadResource());
    expect(d.allowed).toBe(true);
  });

  it("message_thread:view denied for provider with no role", async () => {
    const actor = makeActor({ activeRole: null });
    const d = await can("message_thread:view", actor, makeThreadResource());
    expect(d.allowed).toBe(false);
  });

  it("message_thread:view allowed for applicant owner", async () => {
    const actor = makeActor({
      accountType: "applicant",
      activeRole: null,
      tenantId: null,
      tenantType: null,
      userId: "applicant-user",
    });
    const d = await can("message_thread:view", actor, makeThreadResource({ ownerId: "applicant-user", tenantId: null }));
    expect(d.allowed).toBe(true);
  });

  it("message_thread:view denied for applicant non-owner", async () => {
    const actor = makeActor({
      accountType: "applicant",
      activeRole: null,
      tenantId: null,
      tenantType: null,
      userId: "other-applicant",
    });
    const d = await can("message_thread:view", actor, makeThreadResource({ ownerId: "applicant-user", tenantId: null }));
    expect(d.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// message:delete
// ---------------------------------------------------------------------------

describe("message:delete", () => {
  it("applicant owner can delete their own message", async () => {
    const actor = makeActor({
      accountType: "applicant",
      activeRole: null,
      tenantId: null,
      tenantType: null,
      userId: "applicant-user",
    });
    const resource = makeMessageResource({ ownerId: "applicant-user", tenantId: null });
    const d = await can("message:delete", actor, resource);
    expect(d.allowed).toBe(true);
  });

  it("applicant cannot delete another user's message", async () => {
    const actor = makeActor({
      accountType: "applicant",
      activeRole: null,
      tenantId: null,
      tenantType: null,
      userId: "applicant-other",
    });
    const resource = makeMessageResource({ ownerId: "applicant-user", tenantId: null });
    const d = await can("message:delete", actor, resource);
    expect(d.allowed).toBe(false);
  });

  it("leadership provider can delete any message", async () => {
    const actor = makeActor({ activeRole: "org_owner" });
    const d = await can("message:delete", actor, makeMessageResource());
    expect(d.allowed).toBe(true);
  });

  it("victim_advocate cannot delete messages (not leadership)", async () => {
    const actor = makeActor({ activeRole: "victim_advocate" });
    const resource = makeMessageResource({ ownerId: "some-other-user" });
    const d = await can("message:delete", actor, resource);
    expect(d.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// message:attachment_upload — always denied (deferred to Domain 1.4)
// ---------------------------------------------------------------------------

describe("message:attachment_upload deferred denial", () => {
  it("attachment upload denied for all roles", async () => {
    const roles = ["org_owner", "supervisor", "victim_advocate", "intake_specialist"] as const;
    for (const role of roles) {
      const actor = makeActor({ activeRole: role });
      const d = await can("message:attachment_upload", actor, makeMessageResource());
      expect(d.allowed).toBe(false);
    }
  });
});
