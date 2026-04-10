/**
 * Domain 3.2 — Membership service tests.
 *
 * Tests 22, 27–28 from the D3.2 test plan:
 *   22. listOrgMembers — includes email from profiles; forbidden without org:view_members
 *   27. createJoinRequest — duplicate pending → CONFLICT
 *   28. approveJoinRequest — creates membership with victim_advocate role
 *
 * Supabase client, policyEngine, and logEvent are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthContext } from "@/lib/server/auth/context";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/policy/policyEngine", () => ({
  can: vi.fn().mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false }),
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
  self.in = vi.fn().mockResolvedValue(result); // terminal — profiles query ends with .in()
  self.order = vi.fn().mockResolvedValue(result);
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
  listOrgMembers,
  createJoinRequest,
  approveJoinRequest,
  updateMemberRole,
} from "@/lib/server/organizations/membershipService";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    user: { id: "user-1", email: "admin@example.com" },
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

function makeMemberRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "mem-1",
    user_id: "member-user",
    organization_id: "org-1",
    org_role: "victim_advocate",
    status: "active",
    created_at: "2026-04-09T00:00:00Z",
    ...overrides,
  };
}

function makeJoinRequestRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "jr-1",
    organization_id: "org-1",
    advocate_user_id: "advocate-user",
    status: "pending",
    created_at: "2026-04-09T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("membershipService — listOrgMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });
  });

  it("22. returns member list with email enrichment", async () => {
    const members = [makeMemberRow()];
    const profiles = [{ id: "member-user", email: "member@example.com" }];

    let callCount = 0;
    mockSupabase = makeSbMock({ data: null, error: null });
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: members, error: null }); // org_memberships
      return makeChain({ data: profiles, error: null }); // profiles
    });

    const result = await listOrgMembers("org-1", makeCtx());
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("member@example.com");
    expect(result[0].user_id).toBe("member-user");
  });

  it("22b. policy denied → throws FORBIDDEN", async () => {
    vi.mocked(can).mockResolvedValue({ allowed: false, reason: "INSUFFICIENT_ROLE", message: "Denied.", auditRequired: true });
    mockSupabase = makeSbMock({ data: [], error: null });

    await expect(listOrgMembers("org-1", makeCtx())).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("22c. email defaults to null when profile not found", async () => {
    const members = [makeMemberRow({ user_id: "unknown-user" })];

    let callCount = 0;
    mockSupabase = makeSbMock({ data: null, error: null });
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: members, error: null });
      return makeChain({ data: [], error: null }); // no profiles
    });

    const result = await listOrgMembers("org-1", makeCtx());
    expect(result[0].email).toBeNull();
  });
});

describe("membershipService — createJoinRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });
  });

  it("27. duplicate pending request → CONFLICT", async () => {
    mockSupabase = makeSbMock({ data: { id: "existing-jr" }, error: null });

    await expect(
      createJoinRequest({ organizationId: "org-2" }, makeCtx()),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("27b. no existing request → creates successfully", async () => {
    const joinRow = makeJoinRequestRow();
    let callCount = 0;
    mockSupabase = makeSbMock({ data: null, error: null });
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: null, error: null }); // no existing
      return makeChain({ data: joinRow, error: null }); // insert
    });

    const result = await createJoinRequest({ organizationId: "org-2" }, makeCtx());
    expect(result.status).toBe("pending");
  });
});

describe("membershipService — approveJoinRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });
  });

  it("28. creates membership with victim_advocate role", async () => {
    const joinReq = makeJoinRequestRow({ advocate_user_id: "advocate-user" });
    const memberRow = makeMemberRow({ org_role: "victim_advocate" });

    let callCount = 0;
    mockSupabase = makeSbMock({ data: null, error: null });
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: joinReq, error: null }); // fetch join req
      if (callCount === 2) return makeChain({ data: memberRow, error: null }); // insert membership
      return makeChain({ data: null, error: null }); // mark approved
    });

    const result = await approveJoinRequest("jr-1", makeCtx());
    expect(result.org_role).toBe("victim_advocate");
    expect(result.status).toBe("active");
  });

  it("28b. join request not found → NOT_FOUND", async () => {
    mockSupabase = makeSbMock({ data: null, error: null });

    await expect(approveJoinRequest("jr-missing", makeCtx())).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("membershipService — updateMemberRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });
  });

  it("updates role successfully", async () => {
    const updated = makeMemberRow({ org_role: "supervisor" });
    mockSupabase = makeSbMock({ data: updated, error: null });

    const result = await updateMemberRole({ memberId: "mem-1", newRole: "supervisor" }, makeCtx());
    expect(result.org_role).toBe("supervisor");
  });

  it("invalid role → VALIDATION_ERROR", async () => {
    mockSupabase = makeSbMock({ data: null, error: null });

    await expect(
      updateMemberRole({ memberId: "mem-1", newRole: "invalid_role_xyz" }, makeCtx()),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
