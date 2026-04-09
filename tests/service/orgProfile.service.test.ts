/**
 * Domain 3.2 — Org profile service tests.
 *
 * Tests 9–10, 14–18 from the D3.2 test plan:
 *   9.  getOrganizationProfileForContext — non-admin cannot access another org's profile
 *   10. getOrganizationProfileForContext — admin can access any org
 *   14. updateOrganizationProfile — empty patch → VALIDATION_ERROR
 *   15. updateOrganizationProfile — search index sync fires after update
 *   16. updateOrganizationProfile — sensitive field change fires audit event
 *   17. updateOrganizationProfile — name validation (empty string → VALIDATION_ERROR)
 *   18. updateOrganizationProfile — invalid type → VALIDATION_ERROR
 *
 * Supabase, search sync, and audit are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthContext } from "@/lib/server/auth/context";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/search", () => ({
  syncOrgToIndex: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/organizations/profileFieldSensitivity", () => ({
  filterSensitiveChangedKeys: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/server/organizations/profileSensitiveTracking", () => ({
  buildSensitiveProfileUpdateSnapshots: vi.fn().mockReturnValue([]),
  insertUnresolvedSensitiveProfileFlag: vi.fn().mockResolvedValue(undefined),
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
  self.update = vi.fn().mockReturnValue(self);
  self.eq = vi.fn().mockReturnValue(self);
  self.single = terminal;
  self.maybeSingle = terminal;
  return self;
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

import { syncOrgToIndex } from "@/lib/server/search";
import { logEvent } from "@/lib/server/audit/logEvent";
import { filterSensitiveChangedKeys } from "@/lib/server/organizations/profileFieldSensitivity";
import {
  getOrganizationProfileForContext,
  updateOrganizationProfile,
} from "@/lib/server/organizations/profile";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    user: { id: "user-1", email: "owner@example.com" },
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

function makeOrgDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "org-1",
    name: "Test Org",
    type: "nonprofit",
    status: "active",
    lifecycle_status: "managed",
    public_profile_status: "active",
    profile_stage: "complete",
    profile_status: "complete",
    profile_last_updated_at: "2026-04-01T00:00:00Z",
    activation_submitted_at: null,
    service_types: [],
    languages: ["en"],
    intake_methods: ["phone"],
    accepting_clients: true,
    capacity_status: "accepting",
    special_populations: [],
    accessibility_features: [],
    ein: null,
    metadata: {},
    created_by: "admin-user",
    last_profile_update: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getOrganizationProfileForContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = makeSbMock({ data: makeOrgDbRow(), error: null });
  });

  it("9. non-admin cannot access another org's profile", async () => {
    const ctx = makeCtx({ orgId: "org-1" });
    await expect(
      getOrganizationProfileForContext({ ctx, organizationId: "org-OTHER" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("10. admin can access any org by organizationId", async () => {
    const ctx = makeCtx({ isAdmin: true, orgId: null, orgRole: null });
    mockSupabase = makeSbMock({ data: makeOrgDbRow({ id: "org-OTHER" }), error: null });

    const result = await getOrganizationProfileForContext({ ctx, organizationId: "org-OTHER" });
    expect(result.id).toBe("org-OTHER");
  });

  it("10b. no orgId and not admin → FORBIDDEN", async () => {
    const ctx = makeCtx({ orgId: null });
    await expect(
      getOrganizationProfileForContext({ ctx }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("10c. org not found → NOT_FOUND", async () => {
    mockSupabase = makeSbMock({ data: null, error: null });
    const ctx = makeCtx();
    await expect(
      getOrganizationProfileForContext({ ctx }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("updateOrganizationProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(filterSensitiveChangedKeys).mockReturnValue([]);
  });

  it("14. empty patch → VALIDATION_ERROR", async () => {
    mockSupabase = makeSbMock({ data: makeOrgDbRow(), error: null });

    await expect(
      updateOrganizationProfile({ ctx: makeCtx(), body: {} }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("15. syncOrgToIndex fires after successful update (fire-and-catch, non-blocking)", async () => {
    const orgRow = makeOrgDbRow();
    let callCount = 0;
    mockSupabase = makeSbMock({ data: orgRow, error: null });
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      // First call: fetch before-row; second call: update
      return makeChain({ data: orgRow, error: null });
    });

    await updateOrganizationProfile({
      ctx: makeCtx(),
      body: { accepting_clients: false },
    });

    expect(syncOrgToIndex).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-1" }),
      expect.anything(),
    );
  });

  it("16. sensitive field change fires audit event", async () => {
    vi.mocked(filterSensitiveChangedKeys).mockReturnValue(["accepting_clients"]);
    const orgRow = makeOrgDbRow({ accepting_clients: false });
    mockSupabase = makeSbMock({ data: orgRow, error: null });
    mockSupabase.from.mockImplementation(() => makeChain({ data: orgRow, error: null }));

    await updateOrganizationProfile({
      ctx: makeCtx(),
      body: { accepting_clients: false },
    });

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "org.profile.sensitive_update" }),
    );
  });

  it("17. empty name string → VALIDATION_ERROR", async () => {
    mockSupabase = makeSbMock({ data: makeOrgDbRow(), error: null });

    await expect(
      updateOrganizationProfile({ ctx: makeCtx(), body: { name: "   " } }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("18. invalid org type → VALIDATION_ERROR", async () => {
    mockSupabase = makeSbMock({ data: makeOrgDbRow(), error: null });

    await expect(
      updateOrganizationProfile({ ctx: makeCtx(), body: { type: "invalid_type" } }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("18b. non-admin cannot update another org", async () => {
    mockSupabase = makeSbMock({ data: makeOrgDbRow(), error: null });
    const ctx = makeCtx({ orgId: "org-1" });

    await expect(
      updateOrganizationProfile({ ctx, body: { name: "New Name" }, organizationId: "org-OTHER" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
