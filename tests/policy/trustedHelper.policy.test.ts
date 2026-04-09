/**
 * Domain 5.1 — Trusted helper policy tests (8 tests)
 *
 * Tests evalTrustedHelper() directly. No DB required.
 */

import { describe, it, expect } from "vitest";
import { evalTrustedHelper } from "@/lib/server/trustedHelper/trustedHelperPolicy";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";

function applicantActor(userId = "applicant-1"): PolicyActor {
  return {
    userId,
    accountType: "applicant",
    activeRole: null,
    tenantId: null,
    tenantType: null,
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

function helperActor(userId = "helper-1"): PolicyActor {
  return {
    userId,
    accountType: "applicant",
    activeRole: null,
    tenantId: null,
    tenantType: null,
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

function providerActor(userId = "provider-1"): PolicyActor {
  return {
    userId,
    accountType: "provider",
    activeRole: "victim_advocate",
    tenantId: "org-a",
    tenantType: "provider",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

function agencyActor(): PolicyActor {
  return {
    userId: "agency-1",
    accountType: "agency",
    activeRole: null,
    tenantId: null,
    tenantType: "agency",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

function grantResource(opts: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "trusted_helper",
    id: "grant-1",
    ownerId: "applicant-1",
    ...opts,
  };
}

describe("trusted helper policy", () => {
  it("1. applicant grants helper access on own account — ALLOW", async () => {
    const r = await evalTrustedHelper("trusted_helper:grant", applicantActor(), grantResource({ ownerId: "applicant-1" }));
    expect(r.allowed).toBe(true);
  });

  it("2. applicant views own helper grants — ALLOW", async () => {
    const r = await evalTrustedHelper("trusted_helper:view", applicantActor(), grantResource());
    expect(r.allowed).toBe(true);
  });

  it("3. applicant revokes own helper grant — ALLOW", async () => {
    const r = await evalTrustedHelper("trusted_helper:revoke", applicantActor(), grantResource());
    expect(r.allowed).toBe(true);
  });

  it("4. helper with valid active grant acts as applicant — ALLOW", async () => {
    const r = await evalTrustedHelper(
      "trusted_helper:act_as",
      helperActor("helper-1"),
      grantResource({ status: "case:read" }),
      {
        requestMetadata: {
          helperGrant: {
            status: "active",
            granted_scope: ["case:read"],
            granted_scope_detail: { allowedActions: ["case:read"] },
          },
        },
      },
    );
    expect(r.allowed).toBe(true);
  });

  it("5. helper without any grant acts on behalf of applicant — DENY", async () => {
    const r = await evalTrustedHelper(
      "trusted_helper:act_as",
      helperActor("helper-1"),
      grantResource({ status: "case:read" }),
      { requestMetadata: {} },
    );
    expect(r.allowed).toBe(false);
  });

  it("6. helper with revoked grant acts on behalf of applicant — DENY", async () => {
    const r = await evalTrustedHelper(
      "trusted_helper:act_as",
      helperActor("helper-1"),
      grantResource({ status: "case:read" }),
      {
        requestMetadata: {
          helperGrant: {
            status: "revoked",
            granted_scope: ["case:read"],
          },
        },
      },
    );
    expect(r.allowed).toBe(false);
  });

  it("7. provider advocate updates helper grants directly — DENY", async () => {
    const r = await evalTrustedHelper("trusted_helper:scope.update", providerActor(), grantResource());
    expect(r.allowed).toBe(false);
  });

  it("8. agency user views applicant helper grants — DENY", async () => {
    const r = await evalTrustedHelper("trusted_helper:view", agencyActor(), grantResource());
    expect(r.allowed).toBe(false);
  });
});
