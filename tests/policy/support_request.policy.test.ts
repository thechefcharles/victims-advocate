/**
 * Domain 1.1 — SupportRequest: policy engine tests.
 *
 * Covers the 13 policy scenarios from the test plan:
 *   1.  Unauthenticated → DENY UNAUTHENTICATED
 *   2.  Applicant creates → ALLOW
 *   3.  Provider creates → DENY INSUFFICIENT_ROLE
 *   4.  Applicant submits own request → ALLOW
 *   5.  Applicant submits another applicant's request → DENY
 *   6.  victim_advocate accepts → DENY (ACCEPT_LEADERSHIP excludes advocates)
 *   7.  org_owner accepts same tenant → ALLOW
 *   8.  org_owner declines → ALLOW
 *   9.  org_owner different tenant accepts → DENY CROSS_TENANT
 *   10. Applicant withdraws own request → ALLOW
 *   11. victim_advocate transfers → DENY
 *   12. org_owner transfers → ALLOW
 *   13. view_status_reason: applicant sees own, provider sees org-scoped, cross-tenant denied
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

function srResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "support_request",
    id: "sr-1",
    ownerId: "applicant-1",
    tenantId: "org-1",
    status: "draft",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SupportRequest policy — evalSupportRequest()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Unauthenticated
  it("1. denies unauthenticated actor on any action", async () => {
    const decision = await can("support_request:create", unauthenticated(), srResource());
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("UNAUTHENTICATED");
  });

  // 2. Applicant creates
  it("2. allows applicant to create a support request", async () => {
    const decision = await can(
      "support_request:create",
      applicant(),
      { type: "support_request", id: null, ownerId: "applicant-1", tenantId: "org-1" },
    );
    expect(decision.allowed).toBe(true);
  });

  // 3. Provider cannot create
  it("3. denies provider attempting to create a support request", async () => {
    const decision = await can(
      "support_request:create",
      provider("org_owner"),
      { type: "support_request", id: null, ownerId: "provider-1", tenantId: "org-1" },
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("INSUFFICIENT_ROLE");
  });

  // 4. Applicant submits own
  it("4. allows applicant to submit their own draft request", async () => {
    const decision = await can(
      "support_request:submit",
      applicant({ userId: "applicant-1" }),
      srResource({ ownerId: "applicant-1", status: "draft" }),
    );
    expect(decision.allowed).toBe(true);
  });

  // 5. Applicant submits someone else's
  it("5. denies applicant submitting another applicant's request", async () => {
    const decision = await can(
      "support_request:submit",
      applicant({ userId: "applicant-2" }),
      srResource({ ownerId: "applicant-1" }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("INSUFFICIENT_ROLE");
  });

  // 6. victim_advocate cannot accept (ACCEPT_LEADERSHIP excludes advocates)
  it("6. denies victim_advocate attempting to accept a request", async () => {
    const decision = await can(
      "support_request:accept",
      provider("victim_advocate"),
      srResource({ status: "pending_review" }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("INSUFFICIENT_ROLE");
  });

  // 7. org_owner accepts same tenant
  it("7. allows org_owner to accept a request in their org", async () => {
    const decision = await can(
      "support_request:accept",
      provider("org_owner", "org-1"),
      srResource({ tenantId: "org-1", status: "pending_review" }),
    );
    expect(decision.allowed).toBe(true);
  });

  // 8. org_owner declines
  it("8. allows org_owner to decline a request", async () => {
    const decision = await can(
      "support_request:decline",
      provider("org_owner", "org-1"),
      srResource({ tenantId: "org-1", status: "pending_review" }),
    );
    expect(decision.allowed).toBe(true);
  });

  // 9. org_owner different tenant
  it("9. denies org_owner from a different org accepting a request", async () => {
    const decision = await can(
      "support_request:accept",
      provider("org_owner", "org-2"),
      srResource({ tenantId: "org-1", status: "pending_review" }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("TENANT_SCOPE_MISMATCH");
  });

  // 10. Applicant withdraws own draft
  it("10. allows applicant to withdraw their own draft request", async () => {
    const decision = await can(
      "support_request:withdraw",
      applicant({ userId: "applicant-1" }),
      srResource({ ownerId: "applicant-1", status: "draft" }),
    );
    expect(decision.allowed).toBe(true);
  });

  // 11. victim_advocate cannot transfer
  it("11. denies victim_advocate attempting to transfer a request", async () => {
    const decision = await can(
      "support_request:transfer",
      provider("victim_advocate", "org-1"),
      srResource({ tenantId: "org-1", status: "pending_review" }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("INSUFFICIENT_ROLE");
  });

  // 12. org_owner transfers
  it("12. allows org_owner to transfer a request", async () => {
    const decision = await can(
      "support_request:transfer",
      provider("org_owner", "org-1"),
      srResource({ tenantId: "org-1", status: "pending_review" }),
    );
    expect(decision.allowed).toBe(true);
  });

  // 13. view_status_reason — applicant sees own, cross-tenant denied
  it("13a. allows applicant to view status reason on their own request", async () => {
    const decision = await can(
      "support_request:view_status_reason",
      applicant({ userId: "applicant-1" }),
      srResource({ ownerId: "applicant-1", tenantId: "org-1" }),
    );
    expect(decision.allowed).toBe(true);
  });

  it("13b. denies applicant viewing status reason on another applicant's request", async () => {
    const decision = await can(
      "support_request:view_status_reason",
      applicant({ userId: "applicant-2" }),
      srResource({ ownerId: "applicant-1", tenantId: "org-1" }),
    );
    expect(decision.allowed).toBe(false);
  });

  it("13c. allows provider to view status reason for org-scoped request", async () => {
    const decision = await can(
      "support_request:view_status_reason",
      provider("victim_advocate", "org-1"),
      srResource({ ownerId: "applicant-1", tenantId: "org-1" }),
    );
    expect(decision.allowed).toBe(true);
  });

  // supervisor can assign
  it("14. allows supervisor to assign a request", async () => {
    const decision = await can(
      "support_request:assign",
      provider("supervisor", "org-1"),
      srResource({ tenantId: "org-1", status: "accepted" }),
    );
    expect(decision.allowed).toBe(true);
  });

  // org_owner can close
  it("15. allows org_owner to close a terminal request", async () => {
    const decision = await can(
      "support_request:close",
      provider("org_owner", "org-1"),
      srResource({ tenantId: "org-1", status: "accepted" }),
    );
    expect(decision.allowed).toBe(true);
  });

  // intake_specialist cannot accept (not in ACCEPT_LEADERSHIP)
  it("16. denies intake_specialist attempting to accept a request", async () => {
    const decision = await can(
      "support_request:accept",
      provider("intake_specialist", "org-1"),
      srResource({ tenantId: "org-1", status: "pending_review" }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("INSUFFICIENT_ROLE");
  });
});
