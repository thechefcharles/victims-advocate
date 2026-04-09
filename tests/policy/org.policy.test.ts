/**
 * Domain 3.2 — Org: policy engine tests (12 new actions).
 *
 * Tests 1–8 from the D3.2 test plan:
 *   1.  org:invite — org_owner → ALLOW
 *   2.  org:invite — victim_advocate → DENY
 *   3.  org:accept_invite — unauthenticated → DENY
 *   4.  org:accept_invite — any authenticated (applicant) → ALLOW
 *   5.  org:view_members — supervisor → ALLOW
 *   6.  org:approve_join — supervisor → ALLOW
 *   7.  org:approve_join — victim_advocate → DENY
 *   8.  org:request_to_join — victim_advocate → ALLOW
 *   8b. org:request_to_join — org_owner → DENY (not advocate tier)
 *   8c. org:register — admin → ALLOW
 *   8d. org:register — org_owner → DENY
 *   8e. org:update_member_role — org_owner → ALLOW
 *   8f. org:update_member_role — supervisor → DENY (not management tier)
 *   8g. cross-tenant → DENY for leadership action
 *   8h. org:revoke_member — program_manager → ALLOW
 *   8i. org:view_profile — any active org member → ALLOW
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

import { can } from "@/lib/server/policy/policyEngine";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";
import type { ProviderRole } from "@/lib/registry/authTypes";

// ---------------------------------------------------------------------------
// Actor helpers
// ---------------------------------------------------------------------------

function provider(
  role: ProviderRole,
  tenantId = "org-1",
  overrides: Partial<PolicyActor> = {},
): PolicyActor {
  return {
    userId: "user-1",
    accountType: "provider",
    activeRole: role,
    tenantId,
    tenantType: "provider",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
    ...overrides,
  };
}

function applicant(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    userId: "applicant-1",
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

function admin(): PolicyActor {
  return {
    userId: "admin-1",
    accountType: "platform_admin",
    activeRole: null,
    tenantId: null,
    tenantType: null,
    isAdmin: true,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

function unauthenticated(): PolicyActor {
  return {
    userId: null as unknown as string,
    accountType: "applicant",
    activeRole: null,
    tenantId: null,
    tenantType: null,
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

function orgResource(id = "org-1"): PolicyResource {
  return { type: "org", id, ownerId: id };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("org policy — org:invite", () => {
  it("1. org_owner → ALLOW", async () => {
    const d = await can("org:invite", provider("org_owner"), orgResource());
    expect(d.allowed).toBe(true);
  });

  it("2. victim_advocate → DENY", async () => {
    const d = await can("org:invite", provider("victim_advocate"), orgResource());
    expect(d.allowed).toBe(false);
  });
});

describe("org policy — org:accept_invite", () => {
  it("3. unauthenticated → DENY", async () => {
    const d = await can("org:accept_invite", unauthenticated(), orgResource());
    expect(d.allowed).toBe(false);
  });

  it("4. authenticated applicant (no org role) → ALLOW", async () => {
    const d = await can("org:accept_invite", applicant(), orgResource());
    expect(d.allowed).toBe(true);
  });
});

describe("org policy — org:view_members", () => {
  it("5. supervisor → ALLOW", async () => {
    const d = await can("org:view_members", provider("supervisor"), orgResource());
    expect(d.allowed).toBe(true);
  });

  it("5b. victim_advocate → DENY", async () => {
    const d = await can("org:view_members", provider("victim_advocate"), orgResource());
    expect(d.allowed).toBe(false);
  });
});

describe("org policy — org:approve_join", () => {
  it("6. supervisor → ALLOW", async () => {
    const d = await can("org:approve_join", provider("supervisor"), orgResource());
    expect(d.allowed).toBe(true);
  });

  it("7. victim_advocate → DENY", async () => {
    const d = await can("org:approve_join", provider("victim_advocate"), orgResource());
    expect(d.allowed).toBe(false);
  });
});

describe("org policy — org:request_to_join", () => {
  it("8. victim_advocate → ALLOW", async () => {
    const d = await can("org:request_to_join", provider("victim_advocate"), orgResource());
    expect(d.allowed).toBe(true);
  });

  it("8b. org_owner → DENY (not advocate tier)", async () => {
    const d = await can("org:request_to_join", provider("org_owner"), orgResource());
    expect(d.allowed).toBe(false);
  });
});

describe("org policy — org:register", () => {
  it("8c. admin → ALLOW", async () => {
    const d = await can("org:register", admin(), orgResource());
    expect(d.allowed).toBe(true);
  });

  it("8d. org_owner → DENY (admin only)", async () => {
    const d = await can("org:register", provider("org_owner"), orgResource());
    expect(d.allowed).toBe(false);
  });
});

describe("org policy — org:update_member_role", () => {
  it("8e. org_owner → ALLOW", async () => {
    const d = await can("org:update_member_role", provider("org_owner"), orgResource());
    expect(d.allowed).toBe(true);
  });

  it("8f. supervisor → DENY (management tier required)", async () => {
    const d = await can("org:update_member_role", provider("supervisor"), orgResource());
    expect(d.allowed).toBe(false);
  });
});

describe("org policy — org:revoke_member", () => {
  it("8h. program_manager → ALLOW", async () => {
    const d = await can("org:revoke_member", provider("program_manager"), orgResource());
    expect(d.allowed).toBe(true);
  });
});

describe("org policy — org:view_profile", () => {
  it("8i. active org member (victim_advocate) → ALLOW", async () => {
    const d = await can("org:view_profile", provider("victim_advocate"), orgResource());
    expect(d.allowed).toBe(true);
  });
});

describe("org policy — cross-tenant isolation", () => {
  it("8g. org_owner from different tenant → DENY", async () => {
    const actor = provider("org_owner", "org-OTHER");
    // resource.tenantId must be set for assertSameTenant to enforce isolation
    const resource: PolicyResource = { type: "org", id: "org-1", ownerId: "org-1", tenantId: "org-1" };
    const d = await can("org:manage_members", actor, resource);
    expect(d.allowed).toBe(false);
  });
});
