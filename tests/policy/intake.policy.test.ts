/**
 * Domain 2.1 — Intake: policy engine tests.
 *
 * Covers all 10 required security test categories from CODING_CONTEXT.md and
 * the per-action authorization rules in evalIntake().
 *
 * Scenarios:
 *   1.  Unauthenticated → DENY
 *   2.  Applicant starts own session → ALLOW
 *   3.  Provider tries intake:start → DENY
 *   4.  Agency account tries intake:start → DENY (agency suppression)
 *   5.  Applicant saves draft on own session → ALLOW
 *   6.  Applicant saves draft on submitted session → DENY (status gate)
 *   7.  Applicant saves draft on another's session → DENY (ownership)
 *   8.  Applicant submits own draft session → ALLOW
 *   9.  Applicant submits already-submitted session → DENY
 *   10. Provider tries to submit → DENY (applicant only)
 *   11. Applicant views own session → ALLOW
 *   12. Applicant views another applicant's session → DENY
 *   13. victim_advocate views assigned-case intake → ALLOW
 *   14. victim_advocate views unassigned-case intake → DENY (advocate gate)
 *   15. org_owner views any org-linked intake → ALLOW
 *   16. program_manager views any org-linked intake → ALLOW
 *   17. Cross-tenant org_owner views intake → DENY (CROSS_TENANT)
 *   18. Agency account views intake → DENY (agency suppression)
 *   19. Platform admin views any intake → ALLOW (audit-required)
 *   20. Applicant amends after submission → DENY (v2 deferred)
 *   21. victim_advocate amends assigned-case intake → ALLOW
 *   22. victim_advocate amends unassigned-case intake → DENY
 *   23. program_manager amends intake → ALLOW
 *   24. Agency account amends intake → DENY
 *   25. Platform admin amends intake → ALLOW
 *   26. Provider tries intake:lock_from_silent_edits → DENY
 *   27. Applicant tries intake:lock_from_silent_edits → DENY
 *   28. Platform admin locks intake → ALLOW
 *   29. Unknown action against intake_session → DENY (RESOURCE_NOT_FOUND)
 *   30. Consent missing → CONSENT denial flows through MISSING_CONSENT
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

function agency(): PolicyActor {
  return {
    userId: "agency-1",
    accountType: "agency",
    activeRole: null,
    tenantId: "agency-tenant-1",
    tenantType: "agency",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

function platformAdmin(): PolicyActor {
  return {
    userId: "admin-1",
    accountType: "platform_admin",
    activeRole: null,
    tenantId: null,
    tenantType: "platform",
    isAdmin: true,
    supportMode: false,
    safetyModeEnabled: false,
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

function sessionResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "intake_session",
    id: "session-1",
    ownerId: "applicant-1",
    tenantId: "org-1",
    status: "draft",
    assignedTo: undefined,
    ...overrides,
  };
}

function submissionResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "intake_submission",
    id: "submission-1",
    ownerId: "applicant-1",
    tenantId: "org-1",
    assignedTo: undefined,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("intake policy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("1. unauthenticated is denied for intake:view", async () => {
    const d = await can("intake:view", unauthenticated(), sessionResource());
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("UNAUTHENTICATED");
  });

  it("2. applicant starts own session → ALLOW", async () => {
    const d = await can("intake:start", applicant(), sessionResource({ id: null }));
    expect(d.allowed).toBe(true);
  });

  it("3. provider tries intake:start → DENY", async () => {
    const d = await can("intake:start", provider("org_owner"), sessionResource({ id: null }));
    expect(d.allowed).toBe(false);
  });

  it("4. agency account tries intake:start → DENY", async () => {
    const d = await can("intake:start", agency(), sessionResource({ id: null, tenantId: undefined }));
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("INSUFFICIENT_ROLE");
  });

  it("5. applicant saves draft on own session → ALLOW", async () => {
    const d = await can("intake:save_draft", applicant(), sessionResource());
    expect(d.allowed).toBe(true);
  });

  it("6. applicant saves draft on submitted session → DENY (status gate)", async () => {
    const d = await can(
      "intake:save_draft",
      applicant(),
      sessionResource({ status: "submitted" }),
    );
    expect(d.allowed).toBe(false);
  });

  it("7. applicant saves draft on another's session → DENY (ownership)", async () => {
    const d = await can(
      "intake:save_draft",
      applicant(),
      sessionResource({ ownerId: "applicant-2" }),
    );
    expect(d.allowed).toBe(false);
  });

  it("8. applicant submits own draft session → ALLOW", async () => {
    const d = await can("intake:submit", applicant(), sessionResource());
    expect(d.allowed).toBe(true);
  });

  it("9. applicant submits already-submitted session → DENY", async () => {
    const d = await can("intake:submit", applicant(), sessionResource({ status: "submitted" }));
    expect(d.allowed).toBe(false);
  });

  it("10. provider tries to submit → DENY (applicant only)", async () => {
    const d = await can("intake:submit", provider("org_owner"), sessionResource());
    expect(d.allowed).toBe(false);
  });

  it("11. applicant views own session → ALLOW", async () => {
    const d = await can("intake:view", applicant(), sessionResource());
    expect(d.allowed).toBe(true);
  });

  it("12. applicant views another applicant's session → DENY", async () => {
    const d = await can(
      "intake:view",
      applicant(),
      sessionResource({ ownerId: "applicant-2" }),
    );
    expect(d.allowed).toBe(false);
  });

  it("13. victim_advocate views assigned-case intake → ALLOW", async () => {
    const actor = provider("victim_advocate", "org-1", { userId: "advocate-1" });
    const resource = sessionResource({ assignedTo: "advocate-1" });
    const d = await can("intake:view", actor, resource);
    expect(d.allowed).toBe(true);
  });

  it("14. victim_advocate views unassigned-case intake → DENY", async () => {
    const actor = provider("victim_advocate", "org-1", { userId: "advocate-1" });
    const resource = sessionResource({ assignedTo: "advocate-2" });
    const d = await can("intake:view", actor, resource);
    expect(d.allowed).toBe(false);
  });

  it("15. org_owner views any org-linked intake → ALLOW", async () => {
    const d = await can("intake:view", provider("org_owner"), sessionResource());
    expect(d.allowed).toBe(true);
  });

  it("16. program_manager views any org-linked intake → ALLOW", async () => {
    const d = await can("intake:view", provider("program_manager"), sessionResource());
    expect(d.allowed).toBe(true);
  });

  it("17. cross-tenant org_owner views intake → DENY (TENANT_SCOPE_MISMATCH)", async () => {
    const actor = provider("org_owner", "org-2");
    const resource = sessionResource({ tenantId: "org-1" });
    const d = await can("intake:view", actor, resource);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("TENANT_SCOPE_MISMATCH");
  });

  it("18. agency account views intake → DENY", async () => {
    const d = await can("intake:view", agency(), sessionResource({ tenantId: undefined }));
    expect(d.allowed).toBe(false);
  });

  it("19. platform admin views any intake → ALLOW (audit required)", async () => {
    const d = await can("intake:view", platformAdmin(), sessionResource());
    expect(d.allowed).toBe(true);
    expect(d.auditRequired).toBe(true);
  });

  it("20. applicant amends after submission → DENY (v2 deferred)", async () => {
    const d = await can("intake:amend_after_submission", applicant(), submissionResource());
    expect(d.allowed).toBe(false);
  });

  it("21. victim_advocate amends assigned-case intake → ALLOW", async () => {
    const actor = provider("victim_advocate", "org-1", { userId: "advocate-1" });
    const resource = submissionResource({ assignedTo: "advocate-1" });
    const d = await can("intake:amend_after_submission", actor, resource);
    expect(d.allowed).toBe(true);
  });

  it("22. victim_advocate amends unassigned-case intake → DENY", async () => {
    const actor = provider("victim_advocate", "org-1", { userId: "advocate-1" });
    const resource = submissionResource({ assignedTo: "advocate-2" });
    const d = await can("intake:amend_after_submission", actor, resource);
    expect(d.allowed).toBe(false);
  });

  it("23. program_manager amends intake → ALLOW", async () => {
    const d = await can(
      "intake:amend_after_submission",
      provider("program_manager"),
      submissionResource(),
    );
    expect(d.allowed).toBe(true);
  });

  it("24. agency account amends intake → DENY", async () => {
    const d = await can(
      "intake:amend_after_submission",
      agency(),
      submissionResource({ tenantId: undefined }),
    );
    expect(d.allowed).toBe(false);
  });

  it("25. platform admin amends intake → ALLOW (audit required)", async () => {
    const d = await can("intake:amend_after_submission", platformAdmin(), submissionResource());
    expect(d.allowed).toBe(true);
    expect(d.auditRequired).toBe(true);
  });

  it("26. provider tries intake:lock_from_silent_edits → DENY", async () => {
    const d = await can(
      "intake:lock_from_silent_edits",
      provider("org_owner"),
      sessionResource(),
    );
    expect(d.allowed).toBe(false);
  });

  it("27. applicant tries intake:lock_from_silent_edits → DENY", async () => {
    const d = await can("intake:lock_from_silent_edits", applicant(), sessionResource());
    expect(d.allowed).toBe(false);
  });

  it("28. platform admin locks intake → ALLOW", async () => {
    const d = await can("intake:lock_from_silent_edits", platformAdmin(), sessionResource());
    expect(d.allowed).toBe(true);
    expect(d.auditRequired).toBe(true);
  });

  it("29. unknown action against intake_session → DENY (RESOURCE_NOT_FOUND)", async () => {
    const d = await can("case:read", applicant(), sessionResource());
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("RESOURCE_NOT_FOUND");
  });

  it("30. consent missing → MISSING_CONSENT denial", async () => {
    const d = await can("intake:save_draft", applicant(), sessionResource(), {
      consentStatus: "missing",
    });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("MISSING_CONSENT");
  });
});
