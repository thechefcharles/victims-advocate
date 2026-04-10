/**
 * Gap closure — Applicant → comparative analytics DENY (1 test)
 */

import { describe, it, expect, vi } from "vitest";
import { evalTrust } from "@/lib/server/trust/trustPolicy";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

describe("trust policy gap closure", () => {
  it("applicant attempts provider_score:view_comparative → DENY", async () => {
    const actor: PolicyActor = {
      userId: "user-1",
      accountType: "applicant",
      activeRole: null,
      tenantId: null,
      tenantType: null,
      isAdmin: false,
      supportMode: false,
      safetyModeEnabled: false,
    };
    const resource: PolicyResource = { type: "trust", id: null };
    const decision = await evalTrust("provider_score:view_comparative", actor, resource);
    expect(decision.allowed).toBe(false);
  });
});
