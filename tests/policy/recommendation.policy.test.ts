/**
 * Domain 5.2 — Recommendation policy tests (3 tests)
 *
 * Tests evalRecommendation() directly. No DB required.
 */

import { describe, it, expect } from "vitest";
import { evalRecommendation } from "@/lib/server/recommendations/recommendationPolicy";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";

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
    type: "recommendation",
    id: null,
    ownerId: "user-1",
    ...overrides,
  };
}

describe("recommendation policy", () => {
  it("applicant generates own recommendations — ALLOW", async () => {
    const actor = makeActor();
    const resource = makeResource({ ownerId: "user-1" });
    const result = await evalRecommendation("recommendation:generate", actor, resource);
    expect(result.allowed).toBe(true);
  });

  it("provider gets non-personalized discovery recommendations — ALLOW", async () => {
    const actor = makeActor({
      accountType: "provider",
      activeRole: "org_owner",
      tenantId: "org-a",
      tenantType: "provider",
    });
    const resource = makeResource({ ownerId: null });
    const result = await evalRecommendation("recommendation:view", actor, resource);
    expect(result.allowed).toBe(true);
  });

  it("unauthenticated user — DENY with UNAUTHENTICATED reason", async () => {
    const actor = makeActor({ userId: "" });
    const resource = makeResource();
    const result = await evalRecommendation("recommendation:view", actor, resource);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("UNAUTHENTICATED");
  });

  it("applicant tries to view another applicant's recommendations — DENY", async () => {
    const actor = makeActor({ userId: "user-1" });
    const resource = makeResource({ ownerId: "user-2" });
    const result = await evalRecommendation("recommendation:view", actor, resource);
    expect(result.allowed).toBe(false);
  });
});
