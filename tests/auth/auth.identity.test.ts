/**
 * Domain 0.2 — Auth / Identity
 *
 * Security test coverage (CODING_CONTEXT.md required categories):
 *   1.  Unauthenticated denial          — getAuthContext returns null when no token
 *   2.  Cross-tenant denial             — DEFERRED: Domain 0.3 (policy engine)
 *   3.  Assignment/ownership denial     — DEFERRED: Domain 0.3
 *   4.  Consent-gated denial            — DEFERRED: Domain 1.4
 *   5.  Serializer non-leakage          — DEFERRED: Domain 0.3 (serializers)
 *   6.  Secure file access              — DEFERRED: Domain 1.4
 *   7.  Notification safe content       — DEFERRED: Domain 7.2
 *   8.  Audit event creation            — view-as activation emits audit_log row
 *   9.  Revoked/expired access          — DEFERRED: Domain 0.3 (membership checks)
 *  10.  Admin/support access audited    — view-as activation emits audit_log row (see 8)
 *
 * Deferred items above require Domain 0.3 service boundaries and/or different
 * domain file lists. They are documented here for lock-checklist tracking.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports that use them
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/config", () => ({
  config: {
    supabase: { url: "https://test.supabase.co", anonKey: "test-anon-key" },
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { resolveAccountType } from "@/lib/server/auth/resolveAccountType";
import { buildSessionContext } from "@/lib/server/auth/sessionContext";
import {
  checkLoginLockout,
  recordLoginFailure,
} from "@/lib/server/auth/rateLimit";
import { getAuthContext } from "@/lib/server/auth/context";
import { logEvent } from "@/lib/server/audit/logEvent";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Minimal valid AuthContext for buildSessionContext tests. */
function makeAuthCtx(overrides: Partial<Parameters<typeof buildSessionContext>[0]> = {}) {
  return {
    user: { id: "user-1", email: "test@example.com" },
    userId: "user-1",
    role: "victim" as const,
    realRole: "victim" as const,
    orgId: null,
    orgRole: null,
    affiliatedCatalogEntryId: null,
    organizationCatalogEntryId: null,
    isAdmin: false,
    emailVerified: true,
    accountStatus: "active" as const,
    accountType: "applicant" as const,
    safetyModeEnabled: false,
    ...overrides,
  };
}

/**
 * Builds a mock Supabase admin client factory.
 * Callers chain .from(...).select(...).eq(...).maybeSingle() — the final call
 * resolves with { data, error }. Override `responses` to control each query
 * in call order.
 */
function makeMockSupabase(responses: Array<{ data: unknown; error: unknown }>) {
  let callIndex = 0;
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    maybeSingle: vi.fn().mockImplementation(() => {
      const response = responses[callIndex] ?? { data: null, error: null };
      callIndex++;
      return Promise.resolve(response);
    }),
    then: vi.fn(),
  };
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
    _resetIndex: () => { callIndex = 0; },
  };
}

// ---------------------------------------------------------------------------
// resolveAccountType
// ---------------------------------------------------------------------------

describe("resolveAccountType", () => {
  it("is_admin = true → platform_admin", () => {
    expect(resolveAccountType({ role: "victim", is_admin: true })).toBe("platform_admin");
  });

  it("is_admin = true takes precedence over any role", () => {
    expect(resolveAccountType({ role: "organization", is_admin: true })).toBe("platform_admin");
  });

  it("role = victim → applicant", () => {
    expect(resolveAccountType({ role: "victim", is_admin: false })).toBe("applicant");
  });

  it("role = advocate → provider", () => {
    expect(resolveAccountType({ role: "advocate", is_admin: false })).toBe("provider");
  });

  it("role = organization → provider", () => {
    expect(resolveAccountType({ role: "organization", is_admin: false })).toBe("provider");
  });

  it("unknown role → applicant (safe default)", () => {
    expect(resolveAccountType({ role: "unknown", is_admin: false })).toBe("applicant");
  });

  // Edge cases documented in JSDoc
  it("edge: advocate with no org → still provider (tenantId null is policy engine concern)", () => {
    // resolveAccountType has no awareness of org membership — that's correct.
    // The policy engine enforces tenantId === null → restricted.
    expect(resolveAccountType({ role: "advocate", is_admin: false })).toBe("provider");
  });

  it("edge: organization role with no org → still provider", () => {
    expect(resolveAccountType({ role: "organization", is_admin: false })).toBe("provider");
  });
});

// ---------------------------------------------------------------------------
// buildSessionContext
// ---------------------------------------------------------------------------

describe("buildSessionContext", () => {
  it("returns a SessionContext with accountType and safetyModeEnabled present", () => {
    const ctx = makeAuthCtx({ safetyModeEnabled: true });
    const session = buildSessionContext(ctx);
    expect(session).toHaveProperty("accountType");
    expect(session).toHaveProperty("safetyModeEnabled", true);
  });

  it("maps accountType via resolveAccountType (victim → applicant)", () => {
    const session = buildSessionContext(makeAuthCtx({ role: "victim", is_admin: false } as never));
    expect(session.accountType).toBe("applicant");
  });

  it("maps accountType via resolveAccountType (advocate → provider)", () => {
    const ctx = makeAuthCtx({ role: "advocate" as never, accountType: "provider" });
    const session = buildSessionContext(ctx);
    expect(session.accountType).toBe("provider");
  });

  it("accountStatus: active → active", () => {
    const session = buildSessionContext(makeAuthCtx({ accountStatus: "active" }));
    expect(session.accountStatus).toBe("active");
  });

  it("accountStatus: disabled → suspended (security category 1 — gated at guard layer)", () => {
    const session = buildSessionContext(makeAuthCtx({ accountStatus: "disabled" }));
    expect(session.accountStatus).toBe("suspended");
  });

  it("accountStatus: deleted → deactivated (security category 1 — gated at guard layer)", () => {
    const session = buildSessionContext(makeAuthCtx({ accountStatus: "deleted" }));
    expect(session.accountStatus).toBe("deactivated");
  });

  it("supportMode = true when isAdmin && realRole !== role (view-as active)", () => {
    const ctx = makeAuthCtx({
      isAdmin: true,
      role: "victim" as const,
      realRole: "advocate" as const,
      accountType: "applicant",
    });
    const session = buildSessionContext(ctx);
    expect(session.supportMode).toBe(true);
  });

  it("supportMode = false when realRole === role (no view-as)", () => {
    const ctx = makeAuthCtx({
      isAdmin: true,
      role: "victim" as const,
      realRole: "victim" as const,
      accountType: "platform_admin",
    });
    const session = buildSessionContext(ctx);
    expect(session.supportMode).toBe(false);
  });

  it("tenantId is propagated from ctx.orgId", () => {
    const ctx = makeAuthCtx({ orgId: "org-abc", accountType: "provider" });
    const session = buildSessionContext(ctx);
    expect(session.tenantId).toBe("org-abc");
    expect(session.tenantType).toBe("provider");
  });

  it("tenantId null and tenantType null for applicant with no org", () => {
    const session = buildSessionContext(makeAuthCtx({ orgId: null }));
    expect(session.tenantId).toBeNull();
    expect(session.tenantType).toBeNull();
  });

  it("authenticated is always true", () => {
    const session = buildSessionContext(makeAuthCtx());
    expect(session.authenticated).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Rate limiting — recordLoginFailure / upsertAndIncrement
// ---------------------------------------------------------------------------

describe("rate limiting — recordLoginFailure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("5 failures in window → locked: true, lockedUntil set", async () => {
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "row-1",
            failure_count: 4, // 4 existing → +1 = 5 = MAX_FAILURES
            window_started_at: new Date(Date.now() - 60_000).toISOString(), // within window
            locked_until: null,
          },
          error: null,
        }),
      }),
    };
    (getSupabaseAdmin as Mock).mockReturnValue(mockDb);

    const result = await recordLoginFailure({ email: "user@example.com", ip: null });
    expect(result.locked).toBe(true);
    expect(result.lockedUntil).not.toBeNull();
  });

  it("4 failures in window → not yet locked", async () => {
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "row-1",
            failure_count: 3, // 3 existing → +1 = 4 < 5
            window_started_at: new Date(Date.now() - 60_000).toISOString(),
            locked_until: null,
          },
          error: null,
        }),
      }),
    };
    (getSupabaseAdmin as Mock).mockReturnValue(mockDb);

    const result = await recordLoginFailure({ email: "user@example.com", ip: null });
    expect(result.locked).toBe(false);
    expect(result.lockedUntil).toBeNull();
  });

  it("expired window resets counter — 5 stale failures do not lock", async () => {
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "row-1",
            failure_count: 5, // old failures, but window expired
            window_started_at: new Date(Date.now() - 20 * 60_000).toISOString(), // 20 min ago > 15 min window
            locked_until: null,
          },
          error: null,
        }),
      }),
    };
    (getSupabaseAdmin as Mock).mockReturnValue(mockDb);

    const result = await recordLoginFailure({ email: "user@example.com", ip: null });
    // New window starts at 1 failure
    expect(result.locked).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Rate limiting — checkLoginLockout (admin exempt)
// ---------------------------------------------------------------------------

describe("rate limiting — checkLoginLockout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admin with isAdmin: true → never locked regardless of DB state", async () => {
    // getSupabaseAdmin should not be called at all for admins
    const mockDb = { from: vi.fn() };
    (getSupabaseAdmin as Mock).mockReturnValue(mockDb);

    const result = await checkLoginLockout({
      email: "admin@example.com",
      ip: "1.2.3.4",
      isAdmin: true,
    });
    expect(result.locked).toBe(false);
    expect(result.lockedUntil).toBeNull();
    expect(mockDb.from).not.toHaveBeenCalled();
  });

  it("admin with many prior failures → still not locked (DB not queried)", async () => {
    const mockDb = { from: vi.fn() };
    (getSupabaseAdmin as Mock).mockReturnValue(mockDb);

    const result = await checkLoginLockout({
      email: "admin@example.com",
      isAdmin: true,
    });
    expect(result.locked).toBe(false);
    expect(mockDb.from).not.toHaveBeenCalled();
  });

  it("non-admin with active lockout → locked: true", async () => {
    const futureTime = new Date(Date.now() + 10 * 60_000).toISOString();
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { locked_until: futureTime },
        error: null,
      }),
    };
    (getSupabaseAdmin as Mock).mockReturnValue({ from: vi.fn().mockReturnValue(mockChain) });

    const result = await checkLoginLockout({ email: "user@example.com" });
    expect(result.locked).toBe(true);
    expect(result.lockedUntil).toBe(futureTime);
  });

  it("non-admin with no lockout row → not locked", async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    (getSupabaseAdmin as Mock).mockReturnValue({ from: vi.fn().mockReturnValue(mockChain) });

    const result = await checkLoginLockout({ email: "user@example.com" });
    expect(result.locked).toBe(false);
    expect(result.lockedUntil).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Security category 1 — Unauthenticated denial
// ---------------------------------------------------------------------------

describe("getAuthContext — unauthenticated denial (security category 1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no Authorization header → returns null (AUTH_REQUIRED)", async () => {
    const req = new Request("https://example.com/api/test");
    const ctx = await getAuthContext(req);
    expect(ctx).toBeNull();
  });

  it("non-Bearer token → returns null", async () => {
    const req = new Request("https://example.com/api/test", {
      headers: { Authorization: "Basic sometoken" },
    });
    const ctx = await getAuthContext(req);
    expect(ctx).toBeNull();
  });

  it("invalid token (supabase returns error) → returns null", async () => {
    const mockAnonClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "invalid" } }),
      },
    };
    (createClient as Mock).mockReturnValue(mockAnonClient);

    const req = new Request("https://example.com/api/test", {
      headers: { Authorization: "Bearer bad-token" },
    });
    const ctx = await getAuthContext(req);
    expect(ctx).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// safetyModeEnabled — defaults false when no user_safety_settings row
// ---------------------------------------------------------------------------

describe("getAuthContext — safetyModeEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupValidAuth(profileOverrides: Record<string, unknown> = {}, safetyRow: unknown = null) {
    const mockAnonClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-123",
              email: "user@example.com",
              email_confirmed_at: new Date().toISOString(),
            },
          },
          error: null,
        }),
      },
    };
    (createClient as Mock).mockReturnValue(mockAnonClient);

    // Admin DB query sequence:
    // 1. profiles query
    // 2. org_memberships query
    // 3. user_safety_settings query
    const callResponses = [
      // profiles
      {
        data: {
          role: "victim",
          organization: null,
          is_admin: false,
          account_status: "active",
          affiliated_catalog_entry_id: null,
          ...profileOverrides,
        },
        error: null,
      },
      // org_memberships
      { data: null, error: null },
      // user_safety_settings
      { data: safetyRow, error: null },
    ];

    let callIndex = 0;
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        const res = callResponses[callIndex] ?? { data: null, error: null };
        callIndex++;
        return Promise.resolve(res);
      }),
    };
    (getSupabaseAdmin as Mock).mockReturnValue({ from: vi.fn().mockReturnValue(mockChain) });
  }

  it("no user_safety_settings row → safetyModeEnabled defaults to false", async () => {
    setupValidAuth({}, null); // null row = no safety settings

    const req = new Request("https://example.com/api/test", {
      headers: { Authorization: "Bearer valid-token" },
    });
    const ctx = await getAuthContext(req);
    expect(ctx).not.toBeNull();
    expect(ctx?.safetyModeEnabled).toBe(false);
  });

  it("user_safety_settings row with safety_mode_enabled = true → safetyModeEnabled is true", async () => {
    setupValidAuth({}, { safety_mode_enabled: true });

    const req = new Request("https://example.com/api/test", {
      headers: { Authorization: "Bearer valid-token" },
    });
    const ctx = await getAuthContext(req);
    expect(ctx?.safetyModeEnabled).toBe(true);
  });

  it("getAuthContext return includes accountType field", async () => {
    setupValidAuth({ role: "victim" });

    const req = new Request("https://example.com/api/test", {
      headers: { Authorization: "Bearer valid-token" },
    });
    const ctx = await getAuthContext(req);
    expect(ctx?.accountType).toBe("applicant");
  });
});

// ---------------------------------------------------------------------------
// Security categories 8 + 10 — Audit event creation (view-as activation)
// ---------------------------------------------------------------------------

describe("getAuthContext — view-as activation audit (security categories 8 + 10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admin activating view-as → fires logEvent with auth.view_as_activated", async () => {
    const mockAnonClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "admin-1",
              email: "admin@example.com",
              email_confirmed_at: new Date().toISOString(),
            },
          },
          error: null,
        }),
      },
    };
    (createClient as Mock).mockReturnValue(mockAnonClient);

    let callIndex = 0;
    const callResponses = [
      // profiles
      {
        data: {
          role: "advocate",
          organization: null,
          is_admin: true,
          account_status: "active",
          affiliated_catalog_entry_id: null,
        },
        error: null,
      },
      // org_memberships
      { data: null, error: null },
      // user_safety_settings
      { data: null, error: null },
    ];

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        const res = callResponses[callIndex] ?? { data: null, error: null };
        callIndex++;
        return Promise.resolve(res);
      }),
    };
    (getSupabaseAdmin as Mock).mockReturnValue({ from: vi.fn().mockReturnValue(mockChain) });

    const req = new Request("https://example.com/api/test", {
      headers: {
        Authorization: "Bearer valid-admin-token",
        cookie: "view_as_role=victim",
      },
    });

    await getAuthContext(req);

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.view_as_activated",
        severity: "security",
        metadata: expect.objectContaining({
          view_as_role: "victim",
          is_admin: true,
        }),
      })
    );
  });

  it("non-admin request → logEvent NOT called for view-as", async () => {
    const mockAnonClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-2",
              email: "user@example.com",
              email_confirmed_at: new Date().toISOString(),
            },
          },
          error: null,
        }),
      },
    };
    (createClient as Mock).mockReturnValue(mockAnonClient);

    let callIndex = 0;
    const callResponses = [
      { data: { role: "victim", organization: null, is_admin: false, account_status: "active", affiliated_catalog_entry_id: null }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ];

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        const res = callResponses[callIndex] ?? { data: null, error: null };
        callIndex++;
        return Promise.resolve(res);
      }),
    };
    (getSupabaseAdmin as Mock).mockReturnValue({ from: vi.fn().mockReturnValue(mockChain) });

    // Non-admin with view-as cookie (should be ignored)
    const req = new Request("https://example.com/api/test", {
      headers: {
        Authorization: "Bearer valid-user-token",
        cookie: "view_as_role=advocate",
      },
    });

    await getAuthContext(req);
    expect(logEvent).not.toHaveBeenCalled();
  });
});
