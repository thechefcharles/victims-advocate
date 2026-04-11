/**
 * Gap closure — Provider advocate safety settings denial (2 tests)
 */

import { describe, it, expect, vi } from "vitest";
import { can } from "@/lib/server/policy/policyEngine";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

function advocateActor(): PolicyActor {
  return {
    userId: "advocate-1",
    accountType: "provider",
    activeRole: "victim_advocate",
    tenantId: "org-1",
    tenantType: "provider",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

describe("provider advocate → applicant safety settings", () => {
  it("provider advocate attempts safety_preference:update on another user → DENY", async () => {
    const resource: PolicyResource = {
      type: "safety_preference",
      id: "sp-1",
      ownerId: "applicant-user-1", // different from advocate's userId
    };
    const decision = await can("safety_preference:update", advocateActor(), resource);
    expect(decision.allowed).toBe(false);
  });

  it("provider advocate attempts safety_preference:view on another user → DENY", async () => {
    const resource: PolicyResource = {
      type: "safety_preference",
      id: "sp-1",
      ownerId: "applicant-user-1",
    };
    const decision = await can("safety_preference:view", advocateActor(), resource);
    expect(decision.allowed).toBe(false);
  });
});
