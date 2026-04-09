/**
 * Domain 2.4: Translation / i18n — policy engine tests.
 *
 * Scenarios:
 *   1. Unauthenticated → DENY for translation:explain_text
 *   2. Applicant updates own locale preference → ALLOW
 *   3. Applicant tries translation_mapping_set:view → DENY (admin-only)
 *   4. Provider tries translation_mapping_set:update → DENY INSUFFICIENT_ROLE
 *   5. Platform admin publishes mapping set → ALLOW (audit required)
 *   6. translation:explanation_view_log → DENY for non-admin
 *   7. Agency tries explain_text → ALLOW (agencies use the app too)
 *   8. Agency tries translation_mapping_set:update → DENY
 *   9. Applicant tries to update someone else's locale preference → DENY
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

import { can } from "@/lib/server/policy/policyEngine";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";

function applicant(userId = "applicant-1"): PolicyActor {
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

function provider(role: PolicyActor["activeRole"] = "org_owner"): PolicyActor {
  return {
    userId: "provider-1",
    accountType: "provider",
    activeRole: role,
    tenantId: "org-1",
    tenantType: "provider",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

function agency(): PolicyActor {
  return {
    userId: "agency-1",
    accountType: "agency",
    activeRole: null,
    tenantId: "agency-1",
    tenantType: "agency",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

function platformAdmin(): PolicyActor {
  return {
    userId: "admin-1",
    accountType: "platform_admin",
    activeRole: null,
    tenantId: null,
    tenantType: "platform",
    isAdmin: true,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

function unauthenticated(): PolicyActor {
  return {
    userId: "",
    accountType: "applicant",
    activeRole: null,
    tenantId: null,
    tenantType: null,
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

function explanationResource(): PolicyResource {
  return { type: "explanation_request", id: null };
}

function localePrefResource(ownerId = "applicant-1"): PolicyResource {
  return { type: "locale_preference", id: ownerId, ownerId };
}

function mappingSetResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "translation_mapping_set",
    id: "set-1",
    status: "draft",
    ...overrides,
  };
}

describe("translation policy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("1. unauthenticated denied for translation:explain_text", async () => {
    const d = await can("translation:explain_text", unauthenticated(), explanationResource());
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("UNAUTHENTICATED");
  });

  it("2. applicant updates own locale preference → ALLOW", async () => {
    const d = await can("locale_preference:update", applicant(), localePrefResource("applicant-1"));
    expect(d.allowed).toBe(true);
  });

  it("3. applicant tries translation_mapping_set:view → DENY (admin-only)", async () => {
    const d = await can("translation_mapping_set:view", applicant(), mappingSetResource());
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("INSUFFICIENT_ROLE");
  });

  it("4. provider tries translation_mapping_set:update → DENY", async () => {
    const d = await can("translation_mapping_set:update", provider(), mappingSetResource());
    expect(d.allowed).toBe(false);
  });

  it("5. platform admin publishes mapping set → ALLOW (audit required)", async () => {
    const d = await can("translation_mapping_set:publish", platformAdmin(), mappingSetResource());
    expect(d.allowed).toBe(true);
    expect(d.auditRequired).toBe(true);
  });

  it("6. translation:explanation_view_log → DENY for non-admin", async () => {
    const d = await can("translation:explanation_view_log", provider(), explanationResource());
    expect(d.allowed).toBe(false);
  });

  it("7. agency tries explain_text → ALLOW (agencies use the app too)", async () => {
    const d = await can("translation:explain_text", agency(), explanationResource());
    expect(d.allowed).toBe(true);
  });

  it("8. agency tries translation_mapping_set:update → DENY", async () => {
    const d = await can("translation_mapping_set:update", agency(), mappingSetResource());
    expect(d.allowed).toBe(false);
  });

  it("9. applicant tries to update someone else's locale preference → DENY", async () => {
    const d = await can(
      "locale_preference:update",
      applicant("applicant-1"),
      localePrefResource("applicant-2"),
    );
    expect(d.allowed).toBe(false);
  });
});
