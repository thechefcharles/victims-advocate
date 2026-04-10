/**
 * Domain 6.1 — Trust policy tests (8 tests)
 *
 * Tests evalTrust() directly. No DB required.
 */

import { describe, it, expect, vi } from "vitest";
import { evalTrust } from "@/lib/server/trust/trustPolicy";
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

function makeResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "trust",
    id: "org-a",
    tenantId: "org-a",
    ...overrides,
  };
}

describe("trust policy", () => {
  it("applicant views applicant-safe reliability summary — ALLOW", async () => {
    const result = await evalTrust(
      "provider_reliability:view_applicant_safe",
      makeActor({ accountType: "applicant" }),
      makeResource(),
    );
    expect(result.allowed).toBe(true);
  });

  it("applicant tries to view internal score inputs — DENY", async () => {
    const result = await evalTrust(
      "provider_score:view_internal",
      makeActor({ accountType: "applicant" }),
      makeResource(),
    );
    expect(result.allowed).toBe(false);
  });

  it("provider org_owner views OWN org internal scores — ALLOW", async () => {
    const result = await evalTrust(
      "provider_score:view_internal",
      makeActor({
        accountType: "provider",
        activeRole: "org_owner",
        tenantId: "org-a",
        tenantType: "provider",
      }),
      makeResource({ tenantId: "org-a" }),
    );
    expect(result.allowed).toBe(true);
  });

  it("provider org_owner views ANOTHER org internal scores — DENY", async () => {
    const result = await evalTrust(
      "provider_score:view_internal",
      makeActor({
        accountType: "provider",
        activeRole: "org_owner",
        tenantId: "org-a",
        tenantType: "provider",
      }),
      makeResource({ tenantId: "org-b" }),
    );
    expect(result.allowed).toBe(false);
  });

  it("agency program_officer views comparative analytics — ALLOW", async () => {
    const result = await evalTrust(
      "provider_score:view_comparative",
      makeActor({
        accountType: "agency",
        activeRole: "program_officer",
        tenantType: "agency",
      }),
      makeResource(),
    );
    expect(result.allowed).toBe(true);
  });

  it("agency tries to manage provider affiliation — DENY", async () => {
    const result = await evalTrust(
      "provider_affiliation:manage",
      makeActor({
        accountType: "agency",
        activeRole: "agency_owner",
        tenantType: "agency",
      }),
      makeResource(),
    );
    expect(result.allowed).toBe(false);
  });

  it("provider tries to update methodology — DENY", async () => {
    const result = await evalTrust(
      "score_methodology:update",
      makeActor({
        accountType: "provider",
        activeRole: "org_owner",
        tenantId: "org-a",
        tenantType: "provider",
      }),
      makeResource(),
    );
    expect(result.allowed).toBe(false);
  });

  it("platform admin manages methodology + affiliation — ALLOW with audit", async () => {
    const adminActor = makeActor({
      accountType: "provider",
      isAdmin: true,
      tenantType: "platform",
    });
    const m = await evalTrust("score_methodology:publish", adminActor, makeResource());
    const a = await evalTrust("provider_affiliation:manage", adminActor, makeResource());
    expect(m.allowed).toBe(true);
    expect(m.auditRequired).toBe(true);
    expect(a.allowed).toBe(true);
    expect(a.auditRequired).toBe(true);
  });
});
