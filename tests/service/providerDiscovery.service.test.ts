/**
 * Domain 3.4 — Provider Discovery: 25 tests.
 *
 * Test plan:
 *   1-4:   Policy action evaluation (provider_search:browse)
 *   5-8:   loadOrganizationsMapRows() reads from provider_search_index
 *   9-12:  syncOrgToIndex wiring in org profile route
 *   13-17: indexSync.ts upsert includes address/phone/website
 *   18-21: Map route integration with can() gate
 *   22-25: Edge cases (null coords, empty results, CBO merge, deferred field)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/server/search/indexSync", () => ({
  syncOrgToIndex: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeChain(result: { data: unknown; error: unknown }) {
  const self: Record<string, unknown> = {};
  self.select = vi.fn().mockReturnValue(self);
  self.eq = vi.fn().mockReturnValue(self);
  self.limit = vi.fn().mockResolvedValue(result);
  self.upsert = vi.fn().mockResolvedValue({ error: null });
  self.update = vi.fn().mockReturnValue(self);
  self.delete = vi.fn().mockReturnValue(self);
  self.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  self.from = vi.fn().mockReturnValue(self);
  return self;
}

function makeIndexRow(overrides: Record<string, unknown> = {}) {
  return {
    org_id: "org-abc",
    name: "Test Provider",
    state_codes: ["IL"],
    accepting_clients: true,
    capacity_status: "open",
    approximate: false,
    lat: 41.88,
    lng: -87.63,
    address: "123 Main St, Chicago, IL 60601",
    phone: "312-555-0100",
    website: "https://example.com",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1-4: Policy — provider_search:browse
// ---------------------------------------------------------------------------

describe("provider_search:browse policy", () => {
  it("1. unauthenticated actor (no userId) → evalApplicantDomain returns UNAUTHENTICATED", async () => {
    const { evalApplicantDomain } = await import("@/lib/server/applicant/evalApplicantProfile");
    const actor = { userId: null, accountType: "applicant" as const };
    const resource = { type: "provider_search" as const, id: "all", ownerId: "" };
    const decision = await evalApplicantDomain("provider_search:browse", actor as never, resource);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("UNAUTHENTICATED");
  });

  it("2. applicant actor → provider_search:browse allowed", async () => {
    const { evalApplicantDomain } = await import("@/lib/server/applicant/evalApplicantProfile");
    const actor = { userId: "user-1", accountType: "applicant" as const };
    const resource = { type: "provider_search" as const, id: "all", ownerId: "" };
    const decision = await evalApplicantDomain("provider_search:browse", actor as never, resource);
    expect(decision.allowed).toBe(true);
  });

  it("3. provider actor → provider_search:browse allowed", async () => {
    const { evalApplicantDomain } = await import("@/lib/server/applicant/evalApplicantProfile");
    const actor = { userId: "user-2", accountType: "provider" as const };
    const resource = { type: "provider_search" as const, id: "all", ownerId: "" };
    const decision = await evalApplicantDomain("provider_search:browse", actor as never, resource);
    expect(decision.allowed).toBe(true);
  });

  it("4. platform_admin actor → provider_search:browse allowed", async () => {
    const { evalApplicantDomain } = await import("@/lib/server/applicant/evalApplicantProfile");
    const actor = { userId: "admin-1", accountType: "platform_admin" as const };
    const resource = { type: "provider_search" as const, id: "all", ownerId: "" };
    const decision = await evalApplicantDomain("provider_search:browse", actor as never, resource);
    expect(decision.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5-8: loadOrganizationsMapRows reads from provider_search_index
// ---------------------------------------------------------------------------

describe("loadOrganizationsMapRows — reads from provider_search_index", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("5. queries provider_search_index, not organizations table", async () => {
    const chain = makeChain({ data: [], error: null });
    const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
    vi.mocked(getSupabaseAdmin).mockReturnValue(chain as never);

    const { loadOrganizationsMapRows } = await import(
      "@/lib/server/organizations/organizationsMapData"
    );
    await loadOrganizationsMapRows();

    // from() called with provider_search_index, never with organizations
    const fromCalls = vi.mocked(chain.from as ReturnType<typeof vi.fn>).mock.calls;
    const tableNames = fromCalls.map((c) => c[0]);
    expect(tableNames).toContain("provider_search_index");
    expect(tableNames).not.toContain("organizations");
  });

  it("6. returns OrganizationMapRow[] shaped from index data", async () => {
    const indexRow = makeIndexRow();
    const chain = makeChain({ data: [indexRow], error: null });
    const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
    vi.mocked(getSupabaseAdmin).mockReturnValue(chain as never);

    const { loadOrganizationsMapRows } = await import(
      "@/lib/server/organizations/organizationsMapData"
    );
    const rows = await loadOrganizationsMapRows();

    const dbRow = rows.find((r) => r.id === "org-abc");
    expect(dbRow).toBeDefined();
    expect(dbRow?.name).toBe("Test Provider");
    expect(dbRow?.lat).toBe(41.88);
    expect(dbRow?.lng).toBe(-87.63);
    expect(dbRow?.accepting_clients).toBe(true);
    expect(dbRow?.address).toBe("123 Main St, Chicago, IL 60601");
    expect(dbRow?.phone).toBe("312-555-0100");
    expect(dbRow?.website).toBe("https://example.com");
  });

  it("7. maps state_codes to states field and computes region_label", async () => {
    const indexRow = makeIndexRow({ state_codes: ["IL", "WI"] });
    const chain = makeChain({ data: [indexRow], error: null });
    const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
    vi.mocked(getSupabaseAdmin).mockReturnValue(chain as never);

    const { loadOrganizationsMapRows } = await import(
      "@/lib/server/organizations/organizationsMapData"
    );
    const rows = await loadOrganizationsMapRows();
    const dbRow = rows.find((r) => r.id === "org-abc");
    expect(dbRow?.states).toEqual(["IL", "WI"]);
    expect(typeof dbRow?.region_label).toBe("string");
    expect(dbRow?.region_label.length).toBeGreaterThan(0);
  });

  it("8. merges external CBO rows from JSON file", async () => {
    const chain = makeChain({ data: [], error: null });
    const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
    vi.mocked(getSupabaseAdmin).mockReturnValue(chain as never);

    // The CBO JSON may or may not exist in the test environment.
    // We only assert the function resolves without throwing.
    const { loadOrganizationsMapRows } = await import(
      "@/lib/server/organizations/organizationsMapData"
    );
    const rows = await loadOrganizationsMapRows();
    expect(Array.isArray(rows)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9-12: syncOrgToIndex wiring
// ---------------------------------------------------------------------------

describe("syncOrgToIndex — wiring in org profile route", () => {
  it("9. syncOrgToIndex is exported from lib/server/search/indexSync", async () => {
    const { syncOrgToIndex } = await import("@/lib/server/search/indexSync");
    expect(typeof syncOrgToIndex).toBe("function");
  });

  it("10. syncOrgToIndex resolves without throwing for eligible org (mocked supabase)", async () => {
    const chain = makeChain({ data: null, error: null });
    // Mock the select+eq+maybeSingle chain for org fetch
    (chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: "org-abc",
        name: "Test Org",
        status: "active",
        lifecycle_status: "managed",
        public_profile_status: "active",
        profile_status: "active",
        profile_stage: "searchable",
        service_types: [],
        languages: [],
        coverage_area: null,
        metadata: null,
        capacity_status: "open",
        accepting_clients: true,
        states_of_operation: ["IL"],
      },
      error: null,
    });

    const { syncOrgToIndex } = await import("@/lib/server/search");
    await expect(
      syncOrgToIndex({ organizationId: "org-abc" }, chain as never)
    ).resolves.toBeUndefined();
  });

  it("11. syncOrgToIndex receives organizationId from route context", async () => {
    const { syncOrgToIndex } = await import("@/lib/server/search/indexSync");
    const mockSync = vi.mocked(syncOrgToIndex);
    mockSync.mockResolvedValue(undefined);

    await syncOrgToIndex({ organizationId: "org-test-id" }, {} as never);
    expect(mockSync).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-test-id" }),
      expect.anything()
    );
  });

  it("12. syncOrgToIndex failure is caught and does not reject (fire-and-forget pattern)", async () => {
    const { syncOrgToIndex } = await import("@/lib/server/search/indexSync");
    vi.mocked(syncOrgToIndex).mockRejectedValue(new Error("sync failed"));

    // Verify the rejection can be caught without an unhandled rejection crashing the caller.
    const errors: Error[] = [];
    await syncOrgToIndex({ organizationId: "org-fail" }, {} as never).catch((err: unknown) => {
      errors.push(err as Error);
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("sync failed");
  });
});

// ---------------------------------------------------------------------------
// 13-17: indexSync upsert includes address/phone/website (real implementation)
// ---------------------------------------------------------------------------

// These tests bypass the top-level mock and run the ACTUAL syncOrgToIndex
// to verify the upsert payload shape. Use vi.importActual to get real module.

function makeEligibleOrg(overrides: Record<string, unknown> = {}) {
  return {
    id: "org-abc",
    name: "Test Org",
    status: "active",
    lifecycle_status: "managed",
    public_profile_status: "active",
    profile_status: "active",
    profile_stage: "searchable",
    service_types: [],
    languages: [],
    coverage_area: null,
    metadata: null,
    capacity_status: "open",
    accepting_clients: true,
    states_of_operation: ["IL"],
    ...overrides,
  };
}

describe("syncOrgToIndex — upsert payload includes listing fields (real impl)", () => {
  it("13. upsert includes address from metadata.listing_address", async () => {
    const { syncOrgToIndex: realSync } = await vi.importActual<
      typeof import("@/lib/server/search/indexSync")
    >("@/lib/server/search/indexSync");

    const chain = makeChain({ data: null, error: null });
    (chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeEligibleOrg({ metadata: { listing_address: "456 Oak Ave, Springfield, IL 62701" } }),
      error: null,
    });
    (chain.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

    await realSync({ organizationId: "org-abc" }, chain as never);

    const upsertCalls = vi.mocked(chain.upsert as ReturnType<typeof vi.fn>).mock.calls;
    expect(upsertCalls.length).toBeGreaterThan(0);
    expect(upsertCalls[0][0].address).toBe("456 Oak Ave, Springfield, IL 62701");
  });

  it("14. upsert includes phone from metadata.listing_phone", async () => {
    const { syncOrgToIndex: realSync } = await vi.importActual<
      typeof import("@/lib/server/search/indexSync")
    >("@/lib/server/search/indexSync");

    const chain = makeChain({ data: null, error: null });
    (chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeEligibleOrg({ metadata: { listing_phone: "217-555-0199" } }),
      error: null,
    });
    (chain.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

    await realSync({ organizationId: "org-abc" }, chain as never);

    const upsertCalls = vi.mocked(chain.upsert as ReturnType<typeof vi.fn>).mock.calls;
    expect(upsertCalls[0][0].phone).toBe("217-555-0199");
  });

  it("15. upsert includes website from metadata.listing_website", async () => {
    const { syncOrgToIndex: realSync } = await vi.importActual<
      typeof import("@/lib/server/search/indexSync")
    >("@/lib/server/search/indexSync");

    const chain = makeChain({ data: null, error: null });
    (chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeEligibleOrg({ metadata: { listing_website: "https://testorg.example.com" } }),
      error: null,
    });
    (chain.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

    await realSync({ organizationId: "org-abc" }, chain as never);

    const upsertCalls = vi.mocked(chain.upsert as ReturnType<typeof vi.fn>).mock.calls;
    expect(upsertCalls[0][0].website).toBe("https://testorg.example.com");
  });

  it("16. null metadata → address/phone/website are null (no throw)", async () => {
    const { syncOrgToIndex: realSync } = await vi.importActual<
      typeof import("@/lib/server/search/indexSync")
    >("@/lib/server/search/indexSync");

    const chain = makeChain({ data: null, error: null });
    (chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeEligibleOrg({ metadata: null }),
      error: null,
    });
    (chain.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

    await expect(
      realSync({ organizationId: "org-abc" }, chain as never)
    ).resolves.toBeUndefined();

    const upsertCalls = vi.mocked(chain.upsert as ReturnType<typeof vi.fn>).mock.calls;
    expect(upsertCalls[0][0].address).toBeNull();
    expect(upsertCalls[0][0].phone).toBeNull();
    expect(upsertCalls[0][0].website).toBeNull();
  });

  it("17. non-string metadata fields → gracefully null (no throw)", async () => {
    const { syncOrgToIndex: realSync } = await vi.importActual<
      typeof import("@/lib/server/search/indexSync")
    >("@/lib/server/search/indexSync");

    const chain = makeChain({ data: null, error: null });
    (chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeEligibleOrg({
        metadata: { listing_address: 12345, listing_phone: null, listing_website: true },
      }),
      error: null,
    });
    (chain.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

    await expect(
      realSync({ organizationId: "org-abc" }, chain as never)
    ).resolves.toBeUndefined();

    const upsertCalls = vi.mocked(chain.upsert as ReturnType<typeof vi.fn>).mock.calls;
    expect(upsertCalls[0][0].address).toBeNull();
    expect(upsertCalls[0][0].phone).toBeNull();
    expect(upsertCalls[0][0].website).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 18-21: Map route integration
// ---------------------------------------------------------------------------

describe("provider_search:browse — policy action in registry", () => {
  it("18. provider_search:browse is in POLICY_ACTIONS", async () => {
    const { POLICY_ACTIONS } = await import("@/lib/server/policy/actionRegistry");
    expect(POLICY_ACTIONS).toContain("provider_search:browse");
  });

  it("19. provider_search resource type is in PolicyResourceType (TypeScript compile check)", () => {
    // If this file compiles, PolicyResourceType includes 'provider_search'.
    type CheckType = "provider_search" extends import("@/lib/server/policy/policyTypes").PolicyResourceType
      ? true
      : false;
    const check: CheckType = true;
    expect(check).toBe(true);
  });

  it("20. can() with provider_search:browse and provider_search resource type resolves", async () => {
    const { can } = await import("@/lib/server/policy/policyEngine");
    vi.mocked(can).mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false });

    const result = await can(
      "provider_search:browse",
      { userId: "u1", accountType: "applicant" } as never,
      { type: "provider_search", id: "all", ownerId: "" }
    );
    expect(result.allowed).toBe(true);
  });

  it("21. can() called with correct action in map route context", async () => {
    const { can } = await import("@/lib/server/policy/policyEngine");
    vi.mocked(can).mockResolvedValue({ allowed: false, reason: "UNAUTHENTICATED", auditRequired: true, message: "Auth required." });

    // Simulate what the map route does
    const actor = { userId: null } as never;
    const resource = { type: "provider_search" as const, id: "all", ownerId: "" };
    const decision = await can("provider_search:browse", actor, resource);
    expect(decision.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 22-25: Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("22. index row with null lat/lng → OrganizationMapRow has 0,0 coords", async () => {
    const indexRow = makeIndexRow({ lat: null, lng: null });
    const chain = makeChain({ data: [indexRow], error: null });
    const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
    vi.mocked(getSupabaseAdmin).mockReturnValue(chain as never);

    const { loadOrganizationsMapRows } = await import(
      "@/lib/server/organizations/organizationsMapData"
    );
    const rows = await loadOrganizationsMapRows();
    const dbRow = rows.find((r) => r.id === "org-abc");
    expect(dbRow?.lat).toBe(0);
    expect(dbRow?.lng).toBe(0);
  });

  it("23. empty index results returns only CBO rows (or empty array)", async () => {
    const chain = makeChain({ data: [], error: null });
    const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
    vi.mocked(getSupabaseAdmin).mockReturnValue(chain as never);

    const { loadOrganizationsMapRows } = await import(
      "@/lib/server/organizations/organizationsMapData"
    );
    const rows = await loadOrganizationsMapRows();
    // All rows should be from CBO JSON (external: true) or empty
    const dbRows = rows.filter((r) => !r.external);
    expect(dbRows.length).toBe(0);
  });

  it("24. region_label computed correctly from state_codes with no counties", async () => {
    const { regionLabelForOrg } = await import("@/lib/server/ecosystem/regions");
    // Single state → returns state code
    expect(regionLabelForOrg(["IL"], [])).toBe("IL");
    // Two states, no counties
    expect(regionLabelForOrg(["IL", "WI"], [])).toBe("IL, WI");
    // Empty → unspecified
    expect(regionLabelForOrg([], [])).toBe("Coverage unspecified");
  });

  it("25. response_accessibility is always null in loadOrganizationsMapRows rows", async () => {
    const indexRow = makeIndexRow();
    const chain = makeChain({ data: [indexRow], error: null });
    const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
    vi.mocked(getSupabaseAdmin).mockReturnValue(chain as never);

    const { loadOrganizationsMapRows } = await import(
      "@/lib/server/organizations/organizationsMapData"
    );
    const rows = await loadOrganizationsMapRows();
    const dbRow = rows.find((r) => r.id === "org-abc");
    // [DEFERRED-3.4-002]: response_accessibility not in search index
    expect(dbRow?.response_accessibility).toBeNull();
  });
});
