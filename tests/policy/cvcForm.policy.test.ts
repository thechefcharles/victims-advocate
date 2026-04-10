/**
 * Domain 2.3 — CVC Form Processing: policy engine tests.
 *
 * Scenarios:
 *   1. Unauthenticated → DENY
 *   2. Platform admin creates template → ALLOW (audit required)
 *   3. Provider tries cvc_template:update → DENY INSUFFICIENT_ROLE
 *   4. Provider previews own assigned case → ALLOW
 *   5. victim_advocate previews unassigned case → DENY
 *   6. Cross-tenant org_owner downloads CVC → DENY TENANT_SCOPE_MISMATCH
 *   7. Agency tries cvc_form:generate → DENY
 *   8. Provider tries to generate on closed case → DENY (case state gate)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

import { can } from "@/lib/server/policy/policyEngine";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";

function applicant(): PolicyActor {
  return {
    userId: "applicant-1",
    accountType: "applicant",
    activeRole: null,
    tenantId: null,
    tenantType: null,
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

function provider(
  role: PolicyActor["activeRole"] = "victim_advocate",
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
    tenantId: "agency-1",
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

function templateResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "cvc_form_template",
    id: "template-1",
    status: "draft",
    ...overrides,
  };
}

function caseResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "cvc_form_template",
    id: "case-1",
    tenantId: "org-1",
    assignedTo: "provider-1",
    status: "in_progress",
    ...overrides,
  };
}

describe("cvc form policy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("1. unauthenticated is denied for cvc_form:download", async () => {
    const d = await can("cvc_form:download", unauthenticated(), caseResource());
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("UNAUTHENTICATED");
  });

  it("2. platform admin creates template → ALLOW (audit required)", async () => {
    const d = await can("cvc_template:create", platformAdmin(), templateResource());
    expect(d.allowed).toBe(true);
    expect(d.auditRequired).toBe(true);
  });

  it("3. provider tries cvc_template:update → DENY INSUFFICIENT_ROLE", async () => {
    const d = await can("cvc_template:update", provider("org_owner"), templateResource());
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("INSUFFICIENT_ROLE");
  });

  it("4. provider previews own assigned case → ALLOW", async () => {
    const d = await can("cvc_form:preview", provider("victim_advocate"), caseResource());
    expect(d.allowed).toBe(true);
  });

  it("5. victim_advocate previews unassigned case → DENY", async () => {
    const d = await can(
      "cvc_form:preview",
      provider("victim_advocate", "org-1", { userId: "advocate-other" }),
      caseResource({ assignedTo: "provider-1" }),
    );
    expect(d.allowed).toBe(false);
  });

  it("6. cross-tenant org_owner downloads CVC → DENY TENANT_SCOPE_MISMATCH", async () => {
    const d = await can(
      "cvc_form:download",
      provider("org_owner", "org-2"),
      caseResource({ tenantId: "org-1" }),
    );
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("TENANT_SCOPE_MISMATCH");
  });

  it("7. agency tries cvc_form:generate → DENY", async () => {
    const d = await can("cvc_form:generate", agency(), caseResource({ tenantId: undefined }));
    expect(d.allowed).toBe(false);
  });

  it("8. provider tries to generate on closed case → DENY (case state gate)", async () => {
    const d = await can(
      "cvc_form:generate",
      provider("org_owner"),
      caseResource({ status: "closed" }),
    );
    expect(d.allowed).toBe(false);
  });

  it("bonus: applicant tries cvc_form:preview → DENY (v1 provider only)", async () => {
    const d = await can("cvc_form:preview", applicant(), caseResource({ tenantId: undefined }));
    expect(d.allowed).toBe(false);
  });
});
