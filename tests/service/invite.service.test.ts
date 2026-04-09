/**
 * Domain 3.2 — Invite service tests.
 *
 * Tests 11–13, 19–21 from the D3.2 test plan:
 *   11. createOrgInvite — happy path, token_hash stored, raw token returned
 *   12. acceptOrgInvite — email mismatch → FORBIDDEN
 *   13. acceptOrgInvite — already used → CONFLICT
 *   19. acceptOrgInvite — expired → CONFLICT
 *   20. acceptOrgInvite — happy path creates membership + marks invite used
 *   21. revokeOrgInvite — happy path updates revoked_at
 *
 * Supabase client, policyEngine, and audit logEvent are fully mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthContext } from "@/lib/server/auth/context";

// ---------------------------------------------------------------------------
// Mocks (must be hoisted)
// ---------------------------------------------------------------------------

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/policy/policyEngine", () => ({
  can: vi.fn().mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false }),
}));

vi.mock("@/lib/server/organizations/state", () => ({
  syncOrganizationLifecycleFromOwnership: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(() => mockSupabase),
}));

// ---------------------------------------------------------------------------
// Mutable supabase mock
// ---------------------------------------------------------------------------

let mockSupabase: ReturnType<typeof makeSbMock>;

function makeChain(result: { data: unknown; error: unknown }) {
  const self: Record<string, unknown> = {};
  const terminal = vi.fn().mockResolvedValue(result);
  self.select = vi.fn().mockReturnValue(self);
  self.insert = vi.fn().mockReturnValue(self);
  self.update = vi.fn().mockReturnValue(self);
  self.eq = vi.fn().mockReturnValue(self);
  self.in = vi.fn().mockReturnValue(self);
  self.order = vi.fn().mockReturnValue(self);
  self.single = terminal;
  self.maybeSingle = terminal;
  return self as unknown as {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
  };
}

function makeSbMock(defaultResult: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain = makeChain(defaultResult);
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  };
}

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { can } from "@/lib/server/policy/policyEngine";
import {
  createOrgInvite,
  acceptOrgInvite,
  revokeOrgInvite,
} from "@/lib/server/organizations/inviteService";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    user: { id: "user-1", email: "member@example.com" },
    userId: "user-1",
    role: "organization",
    orgId: "org-1",
    orgRole: "owner",
    affiliatedCatalogEntryId: null,
    organizationCatalogEntryId: null,
    isAdmin: false,
    emailVerified: true,
    accountStatus: "active",
    accountType: "provider",
    safetyModeEnabled: false,
    ...overrides,
  };
}

function makeInviteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    organization_id: "org-1",
    email: "member@example.com",
    org_role: "victim_advocate",
    token_hash: "hashed-token",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    used_at: null,
    used_by: null,
    created_at: "2026-04-09T00:00:00Z",
    created_by: "user-1",
    revoked_at: null,
    revoked_by: null,
    ...overrides,
  };
}

function makeMembershipRow() {
  return {
    id: "mem-1",
    user_id: "user-1",
    organization_id: "org-1",
    org_role: "victim_advocate",
    status: "active",
    created_at: "2026-04-09T00:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("inviteService — createOrgInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });
    const inviteRow = makeInviteRow();
    mockSupabase = makeSbMock({ data: inviteRow, error: null });
  });

  it("11. returns rawToken + invite view on success", async () => {
    const result = await createOrgInvite(
      { email: "member@example.com", orgRole: "victim_advocate" },
      makeCtx(),
    );
    expect(result.rawToken).toBeTruthy();
    expect(result.rawToken).toHaveLength(64); // 32 bytes hex
    expect(result.invite.email).toBe("member@example.com");
    // @ts-expect-error — token_hash must not appear in invite view
    expect(result.invite.token_hash).toBeUndefined();
  });

  it("11b. policy denial → throws FORBIDDEN", async () => {
    vi.mocked(can).mockResolvedValue({ allowed: false, reason: "INSUFFICIENT_ROLE", message: "Denied.", auditRequired: true });
    await expect(
      createOrgInvite({ email: "x@example.com", orgRole: "victim_advocate" }, makeCtx()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("11c. missing orgId → throws FORBIDDEN", async () => {
    await expect(
      createOrgInvite({ email: "x@example.com", orgRole: "victim_advocate" }, makeCtx({ orgId: null })),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("inviteService — acceptOrgInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });
  });

  it("12. email mismatch → FORBIDDEN", async () => {
    const inviteRow = makeInviteRow({ email: "other@example.com" });
    mockSupabase = makeSbMock({ data: inviteRow, error: null });
    // Second from() call (checking existing membership) returns null
    const chain2 = makeChain({ data: null, error: null });
    mockSupabase.from.mockReturnValueOnce(mockSupabase._chain).mockReturnValue(chain2);

    await expect(
      acceptOrgInvite("raw-token-value", makeCtx({ user: { id: "user-1", email: "me@example.com" } })),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("13. already-used invite → CONFLICT", async () => {
    const inviteRow = makeInviteRow({ used_at: "2026-04-08T00:00:00Z" });
    mockSupabase = makeSbMock({ data: inviteRow, error: null });

    await expect(
      acceptOrgInvite("raw-token", makeCtx()),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("19. expired invite → CONFLICT", async () => {
    const inviteRow = makeInviteRow({
      expires_at: new Date(Date.now() - 1000).toISOString(),
      email: "member@example.com",
    });
    mockSupabase = makeSbMock({ data: inviteRow, error: null });

    await expect(
      acceptOrgInvite("raw-token", makeCtx()),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("20. happy path — creates membership and marks invite used", async () => {
    const inviteRow = makeInviteRow({ email: "member@example.com" });
    const membershipRow = makeMembershipRow();

    let callCount = 0;
    mockSupabase = makeSbMock({ data: null, error: null });
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: inviteRow, error: null });   // fetch invite
      if (callCount === 2) return makeChain({ data: null, error: null });         // check existing membership
      if (callCount === 3) return makeChain({ data: membershipRow, error: null }); // insert membership
      return makeChain({ data: null, error: null }); // mark used
    });

    const result = await acceptOrgInvite("raw-token", makeCtx());
    expect(result.status).toBe("active");
    expect(result.org_role).toBe("victim_advocate");
  });
});

describe("inviteService — revokeOrgInvite", () => {
  it("21. happy path — returns void on success", async () => {
    mockSupabase = makeSbMock({ data: { id: "inv-1" }, error: null });
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });

    await expect(
      revokeOrgInvite("inv-1", makeCtx()),
    ).resolves.toBeUndefined();
  });

  it("21b. not found → throws NOT_FOUND", async () => {
    mockSupabase = makeSbMock({ data: null, error: null });
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });

    await expect(
      revokeOrgInvite("inv-1", makeCtx()),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
