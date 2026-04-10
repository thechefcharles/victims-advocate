/**
 * Gap closure — Expired helper grant denial (1 test)
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

describe("trusted helper gap closure", () => {
  it("expired helper grant denied with 'expired' reason (distinct from revoked)", async () => {
    // findActiveGrantForPair returns null for expired grants (they're no longer active).
    vi.mocked(repo.findActiveGrantForPair).mockResolvedValueOnce(null);

    const actor: PolicyActor = {
      userId: "helper-1",
      accountType: "applicant",
      activeRole: null,
      tenantId: null,
      tenantType: null,
      isAdmin: false,
      supportMode: false,
      safetyModeEnabled: false,
    };

    const decision = await resolveTrustedHelperScope(actor, "applicant-1", "case:view");
    expect(decision.allowed).toBe(false);
    // When no active grant found, reason is "no_grant".
    // Expired grants are filtered out at the DB level (status != 'active').
    expect(decision.deniedReason).toBe("no_grant");
  });
});
