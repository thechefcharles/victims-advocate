/**
 * Domain 4.1 — Referral policy tests (8 tests)
 *
 * Tests evalReferral() directly. No DB required.
 */

import { describe, it, expect } from "vitest";
import { evalReferral } from "@/lib/server/referrals/referralPolicy";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";

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

describe("referral policy", () => {
  it("PM/Org Owner in source org can create referral", async () => {
    const actor = makeActor({ activeRole: "program_manager", tenantId: "org-a" });
    const resource = { type: "referral" as const, id: null, tenantId: "org-a" };
    const result = await evalReferral("referral:create", actor, resource);
    expect(result.allowed).toBe(true);
  });

  it("PM/Org Owner in source org can send referral (create action guards send)", async () => {
    const actor = makeActor({ activeRole: "org_owner", tenantId: "org-a" });
    const resource = { type: "referral" as const, id: "ref-1", tenantId: "org-a", status: "draft" };
    const result = await evalReferral("referral:create", actor, resource);
    expect(result.allowed).toBe(true);
  });

  it("receiving PM/Org Owner can accept referral for target org", async () => {
    const actor = makeActor({ activeRole: "org_owner", tenantId: "org-b" });
    const resource = {
      type: "referral" as const,
      id: "ref-1",
      tenantId: "org-b",
      status: "pending_acceptance",
    };
    const result = await evalReferral("referral:accept", actor, resource);
    expect(result.allowed).toBe(true);
  });

  it("receiving PM/Org Owner can reject referral for target org", async () => {
    const actor = makeActor({ activeRole: "supervisor", tenantId: "org-b" });
    const resource = {
      type: "referral" as const,
      id: "ref-1",
      tenantId: "org-b",
      status: "pending_acceptance",
    };
    const result = await evalReferral("referral:reject", actor, resource);
    expect(result.allowed).toBe(true);
  });

  it("provider from wrong account type views referral — victim_advocate is still allowed (provider scope)", async () => {
    const actor = makeActor({ activeRole: "victim_advocate", tenantId: "org-c" });
    const resource = { type: "referral" as const, id: "ref-1", tenantId: "org-a", status: "draft" };
    const result = await evalReferral("referral:view", actor, resource);
    expect(result.allowed).toBe(true);
  });

  it("agency user (non-provider) cannot view referral as provider", async () => {
    const actor = makeActor({ accountType: "agency", tenantType: "agency" });
    const resource = { type: "referral" as const, id: "ref-1" };
    const result = await evalReferral("referral:view", actor, resource);
    expect(result.allowed).toBe(false);
  });

  it("applicant cannot accept referral on behalf of provider", async () => {
    const actor = makeActor({ accountType: "applicant", activeRole: null, tenantId: null, tenantType: null });
    const resource = {
      type: "referral" as const,
      id: "ref-1",
      status: "pending_acceptance",
    };
    const result = await evalReferral("referral:accept", actor, resource);
    expect(result.allowed).toBe(false);
  });

  it("accept is denied when status is not pending_acceptance", async () => {
    const actor = makeActor({ activeRole: "org_owner", tenantId: "org-b" });
    const resource = {
      type: "referral" as const,
      id: "ref-1",
      tenantId: "org-b",
      status: "draft",
    };
    const result = await evalReferral("referral:accept", actor, resource);
    expect(result.allowed).toBe(false);
  });
});
