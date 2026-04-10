/**
 * Domain 1.2 — Case: policy engine tests.
 *
 * Scenarios:
 *   1.  Unauthenticated → DENY UNAUTHENTICATED
 *   2.  Applicant reads own case → ALLOW
 *   3.  Applicant reads another's case → DENY
 *   4.  victim_advocate reads assigned case → ALLOW
 *   5.  victim_advocate reads unassigned case → DENY
 *   6.  org_owner reads any org case → ALLOW
 *   7.  program_manager (new in 1.2) reads case → ALLOW (CASE_LEADERSHIP)
 *   8.  org_owner assigns case → ALLOW
 *   9.  victim_advocate assigns case → DENY (CASE_LEADERSHIP required)
 *   10. org_owner creates case from support request → ALLOW
 *   11. victim_advocate creates from support request → DENY
 *   12. org_owner reassigns case → ALLOW
 *   13. Applicant deletes own case → ALLOW
 *   14. Provider deletes case → DENY
 *   15. Applicant starts appeal on own case → ALLOW
 *   16. Provider starts appeal → DENY
 *   17. org_owner records outcome → ALLOW
 *   18. victim_advocate marks ready (assigned advocate) → ALLOW
 *   19. victim_advocate marks ready (not assigned) → DENY
 *   20. Applicant views notes on own case → ALLOW
 *   21. victim_advocate creates note → ALLOW
 *   22. org_owner cross-tenant → DENY CROSS_TENANT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

import { can } from "@/lib/server/policy/policyEngine";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";

// ---------------------------------------------------------------------------
// Actor helpers
// ---------------------------------------------------------------------------

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

function provider(
  role: PolicyActor["activeRole"],
  tenantId = "org-1",
  overrides: Partial<PolicyActor> = {},
): PolicyActor {
  return {
    userId: "provider-1",
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

function unauthenticated(): PolicyActor {
  return {
    userId: "",
    accountType: "applicant",
    activeRole: null,
    tenantId: null,
    tenantType: null,
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

// ---------------------------------------------------------------------------
// Resource helpers
// ---------------------------------------------------------------------------

function caseResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "case",
    id: "case-1",
    ownerId: "applicant-1",
    tenantId: "org-1",
    assignedTo: undefined,
    status: "open",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("case policy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("1. unauthenticated is denied for case:read", async () => {
    const d = await can("case:read", unauthenticated(), caseResource());
    expect(d.allowed).toBe(false);
  });

  it("2. applicant reads own case → ALLOW", async () => {
    const d = await can("case:read", applicant(), caseResource({ ownerId: "applicant-1" }));
    expect(d.allowed).toBe(true);
  });

  it("3. applicant reads another's case → DENY", async () => {
    const d = await can("case:read", applicant(), caseResource({ ownerId: "applicant-2" }));
    expect(d.allowed).toBe(false);
  });

  it("4. victim_advocate reads assigned case → ALLOW", async () => {
    const actor = provider("victim_advocate", "org-1", { userId: "advocate-1" });
    const resource = caseResource({ assignedTo: "advocate-1" });
    const d = await can("case:read", actor, resource);
    expect(d.allowed).toBe(true);
  });

  it("5. victim_advocate reads unassigned case → DENY", async () => {
    const actor = provider("victim_advocate", "org-1", { userId: "advocate-1" });
    const resource = caseResource({ assignedTo: "advocate-2" });
    const d = await can("case:read", actor, resource);
    expect(d.allowed).toBe(false);
  });

  it("6. org_owner reads any org case → ALLOW", async () => {
    const d = await can("case:read", provider("org_owner"), caseResource());
    expect(d.allowed).toBe(true);
  });

  it("7. program_manager reads case (new in 1.2, CASE_LEADERSHIP) → ALLOW", async () => {
    const d = await can("case:read", provider("program_manager"), caseResource());
    expect(d.allowed).toBe(true);
  });

  it("8. org_owner assigns case → ALLOW", async () => {
    const d = await can("case:assign", provider("org_owner"), caseResource());
    expect(d.allowed).toBe(true);
  });

  it("9. victim_advocate assigns case → DENY", async () => {
    const d = await can("case:assign", provider("victim_advocate"), caseResource());
    expect(d.allowed).toBe(false);
  });

  it("10. org_owner creates case from support request → ALLOW", async () => {
    const d = await can(
      "case:create_from_support_request",
      provider("org_owner"),
      caseResource({ id: null }),
    );
    expect(d.allowed).toBe(true);
  });

  it("11. victim_advocate creates from support request → DENY", async () => {
    const d = await can(
      "case:create_from_support_request",
      provider("victim_advocate"),
      caseResource({ id: null }),
    );
    expect(d.allowed).toBe(false);
  });

  it("12. org_owner reassigns case → ALLOW", async () => {
    const d = await can("case:reassign", provider("org_owner"), caseResource());
    expect(d.allowed).toBe(true);
  });

  it("13. applicant deletes own case → ALLOW", async () => {
    const d = await can("case:delete", applicant(), caseResource({ ownerId: "applicant-1" }));
    expect(d.allowed).toBe(true);
  });

  it("14. provider deletes case → DENY", async () => {
    const d = await can("case:delete", provider("org_owner"), caseResource());
    expect(d.allowed).toBe(false);
  });

  it("15. applicant starts appeal on own case → ALLOW", async () => {
    const d = await can(
      "case:appeal_start",
      applicant(),
      caseResource({ ownerId: "applicant-1", status: "denied" }),
    );
    expect(d.allowed).toBe(true);
  });

  it("16. provider starts appeal → DENY", async () => {
    const d = await can("case:appeal_start", provider("org_owner"), caseResource());
    expect(d.allowed).toBe(false);
  });

  it("17. org_owner records outcome → ALLOW", async () => {
    const d = await can("case:record_outcome", provider("org_owner"), caseResource());
    expect(d.allowed).toBe(true);
  });

  it("18. assigned advocate marks ready → ALLOW", async () => {
    const actor = provider("victim_advocate", "org-1", { userId: "advocate-1" });
    const resource = caseResource({ assignedTo: "advocate-1" });
    const d = await can("case:mark_ready", actor, resource);
    expect(d.allowed).toBe(true);
  });

  it("19. unassigned advocate marks ready → DENY", async () => {
    const actor = provider("victim_advocate", "org-1", { userId: "advocate-1" });
    const resource = caseResource({ assignedTo: "advocate-2" });
    const d = await can("case:mark_ready", actor, resource);
    expect(d.allowed).toBe(false);
  });

  it("20. applicant views notes on own case → ALLOW", async () => {
    const d = await can("case:note_view", applicant(), caseResource({ ownerId: "applicant-1" }));
    expect(d.allowed).toBe(true);
  });

  it("21. victim_advocate creates note → ALLOW", async () => {
    const d = await can("case:note_create", provider("victim_advocate"), caseResource());
    expect(d.allowed).toBe(true);
  });

  it("22. org_owner cross-tenant is denied", async () => {
    const actor = provider("org_owner", "org-2");
    const resource = caseResource({ tenantId: "org-1" });
    const d = await can("case:read", actor, resource);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("TENANT_SCOPE_MISMATCH");
  });
});
