/**
 * Domain 7.3 — AI Guidance policy tests (6 tests)
 */

import { describe, it, expect, vi } from "vitest";
import { evalAIGuidance } from "@/lib/server/aiGuidance/aiGuidancePolicy";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";

vi.mock("@/lib/server/audit/logEvent", () => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));

function makeActor(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    userId: "user-1", accountType: "applicant", activeRole: null,
    tenantId: null, tenantType: null, isAdmin: false, supportMode: false, safetyModeEnabled: false,
    ...overrides,
  };
}

function makeResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return { type: "ai_guidance", id: "session-1", ownerId: "user-1", ...overrides };
}

describe("ai guidance policy", () => {
  it("applicant creates own AI guidance session — ALLOW", async () => {
    const r = await evalAIGuidance("ai_guidance.session.create", makeActor(), makeResource());
    expect(r.allowed).toBe(true);
  });

  it("applicant accesses provider-internal case notes via AI — DENY (cross-user)", async () => {
    const r = await evalAIGuidance(
      "ai_guidance.session.view",
      makeActor({ userId: "user-1" }),
      makeResource({ ownerId: "user-2" }),
    );
    expect(r.allowed).toBe(false);
  });

  it("provider generates copilot draft for own org — ALLOW", async () => {
    const r = await evalAIGuidance(
      "ai_guidance.draft.generate",
      makeActor({ accountType: "provider", activeRole: "victim_advocate", tenantId: "org-a", tenantType: "provider" }),
      makeResource({ type: "advocate_copilot", tenantId: "org-a" }),
    );
    expect(r.allowed).toBe(true);
  });

  it("provider generates draft from other org workflow — DENY", async () => {
    const r = await evalAIGuidance(
      "ai_guidance.draft.generate",
      makeActor({ accountType: "provider", activeRole: "org_owner", tenantId: "org-a", tenantType: "provider" }),
      makeResource({ type: "advocate_copilot", tenantId: "org-b" }),
    );
    expect(r.allowed).toBe(false);
  });

  it("agency gets applicant-level AI case guidance — DENY by default", async () => {
    const r = await evalAIGuidance(
      "ai_guidance.session.create",
      makeActor({ accountType: "agency", activeRole: "program_officer", tenantType: "agency" }),
      makeResource(),
    );
    expect(r.allowed).toBe(false);
  });

  it("admin AI log inspection — ALLOW with audit", async () => {
    const r = await evalAIGuidance(
      "ai_guidance.log.view_admin",
      makeActor({ isAdmin: true, accountType: "provider", tenantType: "platform" }),
      makeResource(),
    );
    expect(r.allowed).toBe(true);
    expect(r.auditRequired).toBe(true);
  });
});
