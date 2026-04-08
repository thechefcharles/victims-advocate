/**
 * Domain 2.2 — State Workflows: policy engine tests.
 *
 * Scenarios:
 *   1. Unauthenticated → DENY
 *   2. Platform admin can publish → ALLOW (audit required)
 *   3. Platform admin can deprecate → ALLOW (audit required)
 *   4. Provider tries update_config → DENY INSUFFICIENT_ROLE
 *   5. Agency tries view → DENY INSUFFICIENT_ROLE
 *   6. Authenticated applicant resolves active config → ALLOW
 *   7. Authenticated provider resolves active config → ALLOW
 *   8. update_config on non-draft status → DENY (status gate denial wording)
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

function provider(role: PolicyActor["activeRole"] = "org_owner"): PolicyActor {
  return {
    userId: "provider-1",
    accountType: "provider",
    activeRole: role,
    tenantId: "org-1",
    tenantType: "provider",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
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

function configResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "state_workflow_config",
    id: "config-1",
    status: "draft",
    ...overrides,
  };
}

describe("state workflow policy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("1. unauthenticated is denied for state_workflow:resolve_active_config", async () => {
    const d = await can("state_workflow:resolve_active_config", unauthenticated(), configResource());
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("UNAUTHENTICATED");
  });

  it("2. platform admin can publish a config → ALLOW (audit required)", async () => {
    const d = await can(
      "state_workflow:publish_version",
      platformAdmin(),
      configResource({ status: "draft" }),
    );
    expect(d.allowed).toBe(true);
    expect(d.auditRequired).toBe(true);
  });

  it("3. platform admin can deprecate an active config → ALLOW (audit required)", async () => {
    const d = await can(
      "state_workflow:deprecate_version",
      platformAdmin(),
      configResource({ status: "active" }),
    );
    expect(d.allowed).toBe(true);
    expect(d.auditRequired).toBe(true);
  });

  it("4. provider tries state_workflow:update_config → DENY INSUFFICIENT_ROLE", async () => {
    const d = await can(
      "state_workflow:update_config",
      provider("org_owner"),
      configResource({ status: "draft" }),
    );
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("INSUFFICIENT_ROLE");
  });

  it("5. agency tries state_workflow:view → DENY INSUFFICIENT_ROLE", async () => {
    const d = await can("state_workflow:view", agency(), configResource());
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("INSUFFICIENT_ROLE");
  });

  it("6. authenticated applicant resolves active config → ALLOW", async () => {
    const d = await can("state_workflow:resolve_active_config", applicant(), configResource());
    expect(d.allowed).toBe(true);
  });

  it("7. authenticated provider resolves active config → ALLOW", async () => {
    const d = await can("state_workflow:resolve_active_config", provider(), configResource());
    expect(d.allowed).toBe(true);
  });

  it("8. update_config on non-draft status → DENY with status-gate wording", async () => {
    const d = await can(
      "state_workflow:update_config",
      provider("org_owner"),
      configResource({ status: "active" }),
    );
    expect(d.allowed).toBe(false);
    expect(d.message ?? "").toMatch(/draft/);
  });
});
