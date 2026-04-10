/**
 * Gap closure — Trusted helper cross-domain tests (2 tests)
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: () => ({}) as never }));

vi.mock("@/lib/server/trustedHelper/trustedHelperRepository", () => ({
  findActiveGrantForPair: vi.fn(),
  getTrustedHelperAccessById: vi.fn(),
  listTrustedHelperAccessByApplicantId: vi.fn(),
  listTrustedHelperAccessByHelperUserId: vi.fn().mockResolvedValue([]),
  insertTrustedHelperAccess: vi.fn(),
  updateTrustedHelperAccessStatus: vi.fn(),
  updateTrustedHelperAccessScope: vi.fn(),
  insertTrustedHelperEvent: vi.fn(),
  listTrustedHelperEventsByGrantId: vi.fn(),
}));

import { resolveTrustedHelperScope } from "@/lib/server/trustedHelper/trustedHelperService";
import * as repo from "@/lib/server/trustedHelper/trustedHelperRepository";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";

function helperActor(): PolicyActor {
  return {
    userId: "helper-1",
    accountType: "applicant",
    activeRole: null,
    tenantId: null,
    tenantType: null,
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
  };
}

describe("trusted helper cross-domain", () => {
  it("helper with active grant and case:view in scope → ALLOW", async () => {
    vi.mocked(repo.findActiveGrantForPair).mockResolvedValueOnce({
      id: "grant-1",
      applicant_user_id: "applicant-1",
      helper_user_id: "helper-1",
      granted_scope: ["case:view"],
      granted_scope_detail: {
        allowedActions: ["case:view", "case:read"],
        allowedDomains: ["case"],
      },
      status: "active",
      granted_at: "2026-04-01T00:00:00Z",
      accepted_at: "2026-04-01T00:00:00Z",
      revoked_at: null,
      granted_by_user_id: "applicant-1",
      notes: null,
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-01T00:00:00Z",
      relationship_type: "guardian",
      expires_at: null,
    });

    const decision = await resolveTrustedHelperScope(
      helperActor(),
      "applicant-1",
      "case:view",
    );
    expect(decision.allowed).toBe(true);
    expect(decision.grantId).toBe("grant-1");
  });

  it("helper with active grant but case NOT in allowed domains → DENY (out_of_scope)", async () => {
    vi.mocked(repo.findActiveGrantForPair).mockResolvedValueOnce({
      id: "grant-2",
      applicant_user_id: "applicant-1",
      helper_user_id: "helper-1",
      granted_scope: ["applicant_profile:view"],
      granted_scope_detail: {
        allowedActions: ["applicant_profile:view"],
        allowedDomains: ["applicant"],
      },
      status: "active",
      granted_at: "2026-04-01T00:00:00Z",
      accepted_at: "2026-04-01T00:00:00Z",
      revoked_at: null,
      granted_by_user_id: "applicant-1",
      notes: null,
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-01T00:00:00Z",
      relationship_type: "family_member",
      expires_at: null,
    });

    const decision = await resolveTrustedHelperScope(
      helperActor(),
      "applicant-1",
      "case:read",
    );
    expect(decision.allowed).toBe(false);
    expect(decision.deniedReason).toBe("out_of_scope");
  });
});
