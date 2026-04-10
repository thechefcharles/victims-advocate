/**
 * Domain 7.1 — Governance policy tests (5 tests)
 */

import { describe, it, expect, vi } from "vitest";
import { evalGovernance } from "@/lib/server/governance/governancePolicy";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

function makeActor(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    userId: "user-1",
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

const resource: PolicyResource = { type: "policy_acceptance", id: null };

describe("governance policy", () => {
  it("applicant accepts required policy — ALLOW", async () => {
    const r = await evalGovernance("policy_acceptance:create", makeActor(), resource);
    expect(r.allowed).toBe(true);
  });

  it("platform admin publishes policy document — ALLOW with audit", async () => {
    const r = await evalGovernance(
      "policy_document:publish",
      makeActor({ isAdmin: true, accountType: "provider", tenantType: "platform" }),
      { type: "policy_document", id: "pd-1" },
    );
    expect(r.allowed).toBe(true);
    expect(r.auditRequired).toBe(true);
  });

  it("provider creates change request — DENY", async () => {
    const r = await evalGovernance(
      "change_request:create",
      makeActor({ accountType: "provider", activeRole: "org_owner", tenantType: "provider" }),
      { type: "change_request", id: null },
    );
    expect(r.allowed).toBe(false);
  });

  it("non-admin views audit events — DENY", async () => {
    const r = await evalGovernance("audit_event:view", makeActor(), { type: "audit_event", id: null });
    expect(r.allowed).toBe(false);
  });

  it("platform admin views/exports audit events — ALLOW", async () => {
    const admin = makeActor({ isAdmin: true, accountType: "provider", tenantType: "platform" });
    const view = await evalGovernance("audit_event:view", admin, { type: "audit_event", id: null });
    const exp = await evalGovernance("audit_event:export", admin, { type: "audit_event", id: null });
    expect(view.allowed).toBe(true);
    expect(exp.allowed).toBe(true);
  });
});
