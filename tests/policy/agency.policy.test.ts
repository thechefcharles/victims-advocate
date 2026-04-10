/**
 * Domain 6.2 — Agency policy tests (9 tests)
 */

import { describe, it, expect, vi } from "vitest";
import { evalAgency } from "@/lib/server/agency/agencyPolicy";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

function makeActor(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    userId: "user-1",
    accountType: "provider",
    activeRole: "org_owner",
    tenantId: "org-a",
    tenantType: "provider",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
    ...overrides,
  };
}

function makeResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "reporting_submission",
    id: "sub-1",
    tenantId: "org-a",
    ...overrides,
  };
}

describe("agency policy", () => {
  it("provider program_manager creates submission for own org — ALLOW", async () => {
    const r = await evalAgency(
      "reporting_submission:create",
      makeActor({ activeRole: "program_manager" }),
      makeResource(),
    );
    expect(r.allowed).toBe(true);
  });

  it("provider org_owner submits reporting package — ALLOW", async () => {
    const r = await evalAgency(
      "reporting_submission:submit",
      makeActor(),
      makeResource(),
    );
    expect(r.allowed).toBe(true);
  });

  it("agency_reviewer views in-scope submission — ALLOW", async () => {
    const r = await evalAgency(
      "reporting_submission:view",
      makeActor({
        accountType: "agency",
        activeRole: "agency_reviewer",
        tenantType: "agency",
        tenantId: "ag-1",
      }),
      makeResource(),
    );
    expect(r.allowed).toBe(true);
  });

  it("agency program_officer requests revision — ALLOW", async () => {
    const r = await evalAgency(
      "reporting_submission:request_revision",
      makeActor({
        accountType: "agency",
        activeRole: "program_officer",
        tenantType: "agency",
      }),
      makeResource(),
    );
    expect(r.allowed).toBe(true);
  });

  it("agency_owner accepts submission — ALLOW", async () => {
    const r = await evalAgency(
      "reporting_submission:accept",
      makeActor({
        accountType: "agency",
        activeRole: "agency_owner",
        tenantType: "agency",
      }),
      makeResource(),
    );
    expect(r.allowed).toBe(true);
  });

  it("applicant views provider reporting submission — DENY", async () => {
    const r = await evalAgency(
      "reporting_submission:view",
      makeActor({
        accountType: "applicant",
        activeRole: null,
        tenantId: null,
        tenantType: null,
      }),
      makeResource(),
    );
    expect(r.allowed).toBe(false);
  });

  it("advocate without leadership role submits — DENY", async () => {
    const r = await evalAgency(
      "reporting_submission:submit",
      makeActor({ activeRole: "victim_advocate" }),
      makeResource(),
    );
    expect(r.allowed).toBe(false);
  });

  it("agency_reviewer CANNOT accept — DENY (officer/owner only)", async () => {
    const r = await evalAgency(
      "reporting_submission:accept",
      makeActor({
        accountType: "agency",
        activeRole: "agency_reviewer",
        tenantType: "agency",
      }),
      makeResource(),
    );
    expect(r.allowed).toBe(false);
    expect(r.message).toMatch(/Reviewer/i);
  });

  it("agency user views submission outside scope (cross-org tenantId) — provider cross-org denied", async () => {
    const r = await evalAgency(
      "reporting_submission:create",
      makeActor({ tenantId: "org-a" }),
      makeResource({ tenantId: "org-b" }),
    );
    expect(r.allowed).toBe(false);
  });
});
