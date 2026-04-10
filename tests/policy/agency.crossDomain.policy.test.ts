/**
 * Gap closure — Agency cross-domain policy denial tests (4 tests)
 *
 * Verifies that agency accounts are denied access to applicant-level
 * operational data across case, intake, and messaging domains.
 */

import { describe, it, expect, vi } from "vitest";
import { can } from "@/lib/server/policy/policyEngine";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

function agencyActor(): PolicyActor {
  return {
    userId: "agency-user-1",
    accountType: "agency",
    activeRole: "program_officer",
    tenantId: "agency-1",
    tenantType: "agency",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

describe("agency cross-domain policy denial", () => {
  it("agency user attempts case:read for applicant case → DENY", async () => {
    const resource: PolicyResource = {
      type: "case",
      id: "case-1",
      ownerId: "applicant-user",
      tenantId: "org-1",
    };
    const decision = await can("case:read", agencyActor(), resource);
    expect(decision.allowed).toBe(false);
  });

  it("agency user attempts intake:view for applicant intake → DENY", async () => {
    const resource: PolicyResource = {
      type: "intake_session",
      id: "is-1",
      ownerId: "applicant-user",
    };
    const decision = await can("intake:view", agencyActor(), resource);
    expect(decision.allowed).toBe(false);
  });

  it("agency user attempts message:send to applicant → DENY", async () => {
    const resource: PolicyResource = {
      type: "message",
      id: "msg-1",
      tenantId: "org-1",
    };
    const decision = await can("message:send", agencyActor(), resource);
    expect(decision.allowed).toBe(false);
  });

  it("agency user attempts message:read on applicant-provider thread → DENY", async () => {
    const resource: PolicyResource = {
      type: "message",
      id: "msg-1",
      tenantId: "org-1",
    };
    const decision = await can("message:read", agencyActor(), resource);
    expect(decision.allowed).toBe(false);
  });
});
