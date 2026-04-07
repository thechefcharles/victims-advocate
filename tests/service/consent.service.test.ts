/**
 * Domain 1.4 — Consent service tests.
 *
 * Validates: grant creation, revocation audit trail, isSharingAllowed logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/trustSignal/signalEmitter", () => ({
  emitSignal: vi.fn().mockResolvedValue({ success: true, signalId: "sig-1" }),
}));

import { logEvent } from "@/lib/server/audit/logEvent";
import { createConsentGrant, revokeConsentGrant } from "@/lib/server/consents/consentService";
import { isSharingAllowed } from "@/lib/server/consents/sharingPermissionService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGrantRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "grant-1",
    applicant_id: "applicant-user",
    granted_to_type: "organization",
    granted_to_id: "org-123",
    purpose_code: "voca_referral",
    status: "active",
    effective_at: "2026-04-07T10:00:00Z",
    expires_at: null,
    created_at: "2026-04-07T10:00:00Z",
    revoked_at: null,
    revoked_by: null,
    created_by: "applicant-user",
    ...overrides,
  };
}

function makeScopeRow() {
  return {
    id: "scope-1",
    grant_id: "grant-1",
    linked_object_type: "case",
    linked_object_id: "case-1",
    doc_types_covered: null,
    created_at: "2026-04-07T10:00:00Z",
  };
}

function makeActor(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    userId: "applicant-user",
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

function makeSupabase(): SupabaseClient {
  function chain(value: unknown) {
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq", "neq", "order", "limit", "in", "update"]) {
      b[m] = vi.fn().mockReturnValue(b);
    }
    b["maybeSingle"] = vi.fn().mockResolvedValue({ data: value, error: null });
    b["single"] = vi.fn().mockResolvedValue({ data: value, error: null });
    b["then"] = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: value, error: null }).then(resolve);
    return b;
  }

  let callCount = 0;
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "consent_grants") {
        callCount++;
        return {
          insert: vi.fn().mockReturnValue(chain(makeGrantRow())),
          select: vi.fn().mockReturnValue(chain(makeGrantRow())),
          update: vi.fn().mockReturnValue(chain({ ...makeGrantRow(), status: "revoked", revoked_at: new Date().toISOString() })),
          eq: vi.fn().mockReturnValue(chain(makeGrantRow())),
        };
      }
      if (table === "consent_scopes") {
        return {
          insert: vi.fn().mockReturnValue(chain(makeScopeRow())),
          select: vi.fn().mockReturnValue(chain(makeScopeRow())),
          eq: vi.fn().mockReturnValue(chain(makeScopeRow())),
          maybeSingle: vi.fn().mockResolvedValue({ data: makeScopeRow(), error: null }),
        };
      }
      if (table === "consent_revocations") {
        return {
          insert: vi.fn().mockReturnValue(chain({ id: "rev-1" })),
        };
      }
      return { insert: vi.fn().mockReturnValue(chain({})), select: vi.fn().mockReturnValue(chain({})) };
    }),
  } as unknown as SupabaseClient;
}

beforeEach(() => { vi.clearAllMocks(); });

// ---------------------------------------------------------------------------
// createConsentGrant
// ---------------------------------------------------------------------------

describe("createConsentGrant()", () => {
  it("returns applicant view with status=active", async () => {
    const actor = makeActor();
    const supabase = makeSupabase();
    const result = await createConsentGrant(
      actor,
      {
        applicant_id: "applicant-user",
        granted_to_type: "organization",
        granted_to_id: "org-123",
        purpose_code: "voca_referral",
        scope: { linked_object_type: "case", linked_object_id: "case-1" },
      },
      supabase,
    );
    expect(result.status).toBe("active");
    expect(result.id).toBe("grant-1");
  });

  it("fires consent.grant_created audit event", async () => {
    const actor = makeActor();
    const supabase = makeSupabase();
    await createConsentGrant(
      actor,
      {
        applicant_id: "applicant-user",
        granted_to_type: "organization",
        granted_to_id: "org-123",
        purpose_code: "voca_referral",
        scope: { linked_object_type: "case", linked_object_id: "case-1" },
      },
      supabase,
    );
    expect(vi.mocked(logEvent)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "consent.grant_created" }),
    );
  });

  it("throws FORBIDDEN when provider tries to create consent", async () => {
    const actor = makeActor({ accountType: "provider", activeRole: "supervisor", tenantId: "org-123", tenantType: "provider" });
    const supabase = makeSupabase();
    await expect(
      createConsentGrant(
        actor,
        {
          applicant_id: "applicant-user",
          granted_to_type: "organization",
          granted_to_id: "org-123",
          purpose_code: "voca_referral",
          scope: { linked_object_type: "case", linked_object_id: "case-1" },
        },
        supabase,
      ),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// revokeConsentGrant
// ---------------------------------------------------------------------------

describe("revokeConsentGrant()", () => {
  it("fires consent.grant_revoked audit event", async () => {
    const actor = makeActor();
    const supabase = makeSupabase();
    await revokeConsentGrant(actor, "grant-1", { reason: "no longer needed" }, supabase);
    expect(vi.mocked(logEvent)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "consent.grant_revoked" }),
    );
  });

  it("throws FORBIDDEN when provider tries to revoke", async () => {
    const actor = makeActor({ accountType: "provider", activeRole: "supervisor", tenantId: "org-123", tenantType: "provider" });
    const supabase = makeSupabase();
    await expect(revokeConsentGrant(actor, "grant-1", {}, supabase)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// isSharingAllowed (sharingPermissionService)
// ---------------------------------------------------------------------------

describe("isSharingAllowed()", () => {
  it("returns allowed=true when active grant exists covering the case", async () => {
    // Build a supabase that returns the grant and scope
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        const b: Record<string, unknown> = {};
        for (const m of ["select", "eq", "neq"]) { b[m] = vi.fn().mockReturnValue(b); }
        b["maybeSingle"] = vi.fn().mockResolvedValue({
          data: table === "consent_scopes" ? makeScopeRow() : makeGrantRow(),
          error: null,
        });
        return b;
      }),
    } as unknown as SupabaseClient;

    const result = await isSharingAllowed(supabase, {
      applicantId: "applicant-user",
      recipientOrgId: "org-123",
      linkedObjectType: "case",
      linkedObjectId: "case-1",
    });
    expect(result.allowed).toBe(true);
  });

  it("returns allowed=false with reason=no_active_grant when no grant", async () => {
    const supabase = {
      from: vi.fn().mockImplementation(() => {
        const b: Record<string, unknown> = {};
        for (const m of ["select", "eq", "neq"]) { b[m] = vi.fn().mockReturnValue(b); }
        b["maybeSingle"] = vi.fn().mockResolvedValue({ data: null, error: null });
        return b;
      }),
    } as unknown as SupabaseClient;

    const result = await isSharingAllowed(supabase, {
      applicantId: "applicant-user",
      recipientOrgId: "org-123",
      linkedObjectType: "case",
      linkedObjectId: "case-1",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("no_active_grant");
  });

  it("returns allowed=false with reason=grant_expired when expires_at is past", async () => {
    const expiredGrant = makeGrantRow({ expires_at: "2020-01-01T00:00:00Z" });
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        const b: Record<string, unknown> = {};
        for (const m of ["select", "eq", "neq"]) { b[m] = vi.fn().mockReturnValue(b); }
        b["maybeSingle"] = vi.fn().mockResolvedValue({
          data: table === "consent_scopes" ? makeScopeRow() : expiredGrant,
          error: null,
        });
        return b;
      }),
    } as unknown as SupabaseClient;

    const result = await isSharingAllowed(supabase, {
      applicantId: "applicant-user",
      recipientOrgId: "org-123",
      linkedObjectType: "case",
      linkedObjectId: "case-1",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("grant_expired");
  });
});
