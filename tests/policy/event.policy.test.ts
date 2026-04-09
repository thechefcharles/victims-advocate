/**
 * Domain 4.3 — Event policy tests (6 tests)
 *
 * Tests evalEvent() directly. No DB required.
 */

import { describe, it, expect } from "vitest";
import { evalEvent } from "@/lib/server/events/eventPolicy";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";
import type { EventAudienceScope } from "@/lib/server/events/eventTypes";

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

function makeResource(
  overrides: Partial<PolicyResource> & { audienceScope?: EventAudienceScope } = {},
): PolicyResource & { audienceScope?: EventAudienceScope } {
  return {
    type: "event",
    id: "evt-1",
    tenantId: "org-a",
    status: "published",
    audienceScope: "public",
    ...overrides,
  };
}

describe("event policy", () => {
  it("applicant views published public event — ALLOW", async () => {
    const actor = makeActor({
      accountType: "applicant",
      activeRole: null,
      tenantId: null,
      tenantType: null,
    });
    const resource = makeResource({ audienceScope: "applicant_visible" });
    const result = await evalEvent("event:view", actor, resource);
    expect(result.allowed).toBe(true);
  });

  it("applicant views provider_internal event — DENY", async () => {
    const actor = makeActor({
      accountType: "applicant",
      activeRole: null,
      tenantId: null,
      tenantType: null,
    });
    const resource = makeResource({ audienceScope: "provider_internal" });
    const result = await evalEvent("event:view", actor, resource);
    expect(result.allowed).toBe(false);
  });

  it("provider org_owner in same org creates event — ALLOW", async () => {
    const actor = makeActor({ activeRole: "org_owner", tenantId: "org-a" });
    const resource = makeResource({ id: null, tenantId: "org-a" });
    const result = await evalEvent("event:create", actor, resource);
    expect(result.allowed).toBe(true);
  });

  it("provider from different org updates event — DENY", async () => {
    const actor = makeActor({ activeRole: "org_owner", tenantId: "org-b" });
    const resource = makeResource({ tenantId: "org-a" });
    const result = await evalEvent("event:update", actor, resource);
    expect(result.allowed).toBe(false);
  });

  it("agency account manages provider event — DENY", async () => {
    const actor = makeActor({
      accountType: "agency",
      activeRole: null,
      tenantType: "agency",
    });
    const resource = makeResource();
    const result = await evalEvent("event:publish", actor, resource);
    expect(result.allowed).toBe(false);
  });

  it("register on cancelled event — DENY", async () => {
    const actor = makeActor({
      accountType: "applicant",
      activeRole: null,
      tenantId: null,
      tenantType: null,
    });
    const resource = makeResource({ status: "cancelled" });
    const result = await evalEvent("event:register", actor, resource);
    expect(result.allowed).toBe(false);
  });
});
