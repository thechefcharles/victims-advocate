/**
 * Gap closure — Consent-gated cross-domain tests (4 tests)
 *
 * Tests consent enforcement in referral send + document access.
 * Uses the policy engine's PolicyContext.consentStatus field.
 */

import { describe, it, expect, vi } from "vitest";
import { can } from "@/lib/server/policy/policyEngine";
import type { PolicyActor, PolicyResource, PolicyContext } from "@/lib/server/policy/policyTypes";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

function providerActor(): PolicyActor {
  return {
    userId: "provider-1",
    accountType: "provider",
    activeRole: "victim_advocate",
    tenantId: "org-1",
    tenantType: "provider",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

function applicantActor(): PolicyActor {
  return {
    userId: "applicant-1",
    accountType: "applicant",
    activeRole: null,
    tenantId: null,
    tenantType: null,
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

describe("consent-gated cross-domain", () => {
  it("document:view DENIED when consent is missing", async () => {
    const resource: PolicyResource = {
      type: "document",
      id: "doc-1",
      tenantId: "org-1",
      ownerId: "applicant-1",
      assignedTo: "provider-1", // advocate is assigned to this case
    };
    const context: PolicyContext = { consentStatus: "missing" };
    const decision = await can("document:view", providerActor(), resource, context);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("MISSING_CONSENT");
  });

  it("document:view ALLOWED when consent is accepted", async () => {
    const resource: PolicyResource = {
      type: "document",
      id: "doc-1",
      tenantId: "org-1",
      ownerId: "applicant-1",
      assignedTo: "provider-1", // advocate is assigned
    };
    const context: PolicyContext = { consentStatus: "accepted" };
    const decision = await can("document:view", providerActor(), resource, context);
    expect(decision.allowed).toBe(true);
  });

  it("consent:create ALLOWED for applicant granting consent", async () => {
    const resource: PolicyResource = {
      type: "consent",
      id: null,
      ownerId: "applicant-1",
    };
    const decision = await can("consent:create", applicantActor(), resource);
    expect(decision.allowed).toBe(true);
  });

  it("consent:revoke DENIED for provider (only applicant can revoke own grants)", async () => {
    const resource: PolicyResource = {
      type: "consent",
      id: "cg-1",
      ownerId: "applicant-1", // grant belongs to applicant
    };
    const decision = await can("consent:revoke", providerActor(), resource);
    expect(decision.allowed).toBe(false);
  });
});
