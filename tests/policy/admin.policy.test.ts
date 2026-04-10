/**
 * Domain 7.4 — Admin policy tests (7 tests)
 */

import { describe, it, expect, vi } from "vitest";
import { evalAdminTools } from "@/lib/server/admin/adminPolicy";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";

vi.mock("@/lib/server/audit/logEvent", () => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));

function makeActor(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    userId: "user-1", accountType: "applicant", activeRole: null,
    tenantId: null, tenantType: null, isAdmin: false, supportMode: false, safetyModeEnabled: false,
    ...overrides,
  };
}

const resource: PolicyResource = { type: "admin_tools", id: null };

describe("admin policy", () => {
  it("non-admin applicant denied all admin routes — DENY", async () => {
    const r = await evalAdminTools("admin.audit.view", makeActor(), resource);
    expect(r.allowed).toBe(false);
  });

  it("non-admin provider denied all admin routes — DENY", async () => {
    const r = await evalAdminTools(
      "admin.organization.inspect",
      makeActor({ accountType: "provider", activeRole: "org_owner", tenantId: "org-a", tenantType: "provider" }),
      resource,
    );
    expect(r.allowed).toBe(false);
  });

  it("platform admin views audit logs — ALLOW with audit", async () => {
    const r = await evalAdminTools(
      "admin.audit.view",
      makeActor({ isAdmin: true, tenantType: "platform" }),
      resource,
    );
    expect(r.allowed).toBe(true);
    expect(r.auditRequired).toBe(true);
  });

  it("platform admin inspects organization — ALLOW", async () => {
    const r = await evalAdminTools(
      "admin.organization.inspect",
      makeActor({ isAdmin: true, tenantType: "platform" }),
      resource,
    );
    expect(r.allowed).toBe(true);
  });

  it("platform admin updates affiliation status — ALLOW", async () => {
    const r = await evalAdminTools(
      "admin.affiliation.update",
      makeActor({ isAdmin: true, tenantType: "platform" }),
      resource,
    );
    expect(r.allowed).toBe(true);
  });

  it("platform admin publishes state workflow config — ALLOW", async () => {
    const r = await evalAdminTools(
      "admin.state_workflow.publish",
      makeActor({ isAdmin: true, tenantType: "platform" }),
      resource,
    );
    expect(r.allowed).toBe(true);
  });

  it("unauthenticated user — DENY with UNAUTHENTICATED", async () => {
    const r = await evalAdminTools(
      "admin.audit.view",
      makeActor({ userId: "" }),
      resource,
    );
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("UNAUTHENTICATED");
  });
});
