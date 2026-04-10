/**
 * Domain 3.2 normalization — Organization policy tests (8 tests)
 */

import { describe, it, expect, vi } from "vitest";
import { evalOrganization } from "@/lib/server/organizations/organizationPolicy";
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
  return { type: "org", id: "org-a", tenantId: "org-a", ...overrides };
}

describe("organization policy", () => {
  it("any authenticated provider views public org profile — ALLOW", async () => {
    const r = await evalOrganization("org:view_profile", makeActor(), makeResource());
    expect(r.allowed).toBe(true);
  });

  it("org member views internal org data — ALLOW", async () => {
    const r = await evalOrganization(
      "org:view_members",
      makeActor({ activeRole: "org_owner" }),
      makeResource(),
    );
    expect(r.allowed).toBe(true);
  });

  it("non-member views internal org data — DENY", async () => {
    const r = await evalOrganization(
      "org:view_members",
      makeActor({ activeRole: "victim_advocate" }),
      makeResource(),
    );
    expect(r.allowed).toBe(false);
  });

  it("program manager edits org profile — ALLOW", async () => {
    const r = await evalOrganization(
      "org:edit_profile",
      makeActor({ activeRole: "program_manager" }),
      makeResource(),
    );
    expect(r.allowed).toBe(true);
  });

  it("advocate edits org profile — DENY", async () => {
    const r = await evalOrganization(
      "org:edit_profile",
      makeActor({ activeRole: "victim_advocate" }),
      makeResource(),
    );
    expect(r.allowed).toBe(false);
  });

  it("org owner manages members — ALLOW", async () => {
    const r = await evalOrganization(
      "org:manage_members",
      makeActor({ activeRole: "org_owner" }),
      makeResource(),
    );
    expect(r.allowed).toBe(true);
  });

  it("program manager manages members — DENY (owner/supervisor only)", async () => {
    const r = await evalOrganization(
      "org:manage_members",
      makeActor({ activeRole: "program_manager" }),
      makeResource(),
    );
    expect(r.allowed).toBe(false);
  });

  it("platform admin registers org — ALLOW", async () => {
    const r = await evalOrganization(
      "org:register",
      makeActor({ isAdmin: true, tenantType: "platform" }),
      makeResource(),
    );
    expect(r.allowed).toBe(true);
  });
});
