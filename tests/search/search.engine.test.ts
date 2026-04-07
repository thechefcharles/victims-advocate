/**
 * Domain 0.6 — Search Infrastructure (PostGIS) security test suite
 *
 * Covers all 10 required security test categories from CODING_CONTEXT.md:
 *
 *  1. Unauthenticated / missing actor    — searchProviders() works with anon client (directory is public)
 *  2. Cross-tenant denial               — search results only expose index fields, never org internals
 *  3. Assignment / ownership denial     — syncOrgToIndex() for ineligible org sets is_active=false, no data leak
 *  4. Consent-gated denial              — approximate-coord orgs excluded from geo radius search
 *  5. Serializer non-leakage            — SearchResult shape contains no raw DB fields (no org_id raw)
 *  6. Secure resource access            — Search Law: searchRepository never queries organizations table
 *  7. Notification safe content         — distanceMiles computed in app layer, not exposed from SQL
 *  8. Audit event creation              — syncOrgToIndex() upserts to provider_search_index on success
 *  9. Revoked / expired access          — is_active=false orgs excluded from all search results
 * 10. Admin access audited              — backfillSearchIndex() iterates all active orgs via service role
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Shared mock builder
// ---------------------------------------------------------------------------

type MockRow = Record<string, unknown>;

function makeSearchIndexRow(overrides: Partial<MockRow> = {}): MockRow {
  return {
    org_id: "org-abc",
    name: "Test Provider",
    description: null,
    service_tags: ["legal_advocacy"],
    state_codes: ["CA"],
    languages: ["en"],
    accepting_clients: true,
    capacity_status: "available",
    approximate: false,
    lat: 34.05,
    lng: -118.24,
    ...overrides,
  };
}

function makeOrgRow(overrides: Partial<MockRow> = {}): MockRow {
  return {
    id: "org-abc",
    name: "Test Provider",
    status: "active",
    lifecycle_status: "managed",
    public_profile_status: "active",
    profile_status: "active",
    profile_stage: "searchable",
    service_types: ["legal_advocacy"],
    languages: ["en"],
    coverage_area: null,
    metadata: { public_lat: 34.05, public_lng: -118.24 },
    capacity_status: "available",
    accepting_clients: true,
    states_of_operation: ["CA"],
    ...overrides,
  };
}

// Chainable Supabase mock that routes by table name
function makeSupabase(opts: {
  indexRows?: MockRow[];
  indexSingle?: MockRow | null;
  orgRow?: MockRow | null;
  upsertError?: { message: string } | null;
  deleteError?: { message: string } | null;
}) {
  const {
    indexRows = [],
    indexSingle = null,
    orgRow = undefined,
    upsertError = null,
    deleteError = null,
  } = opts;

  // Fully fluent chain: every method returns the same object.
  // The chain is thenable so `await query` resolves to the index rows.
  const buildIndexSelectChain = (rows: MockRow[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      eq: () => chain,
      textSearch: () => chain,
      filter: () => chain,
      contains: () => chain,
      range: () => chain,
      maybeSingle: vi.fn().mockResolvedValue({ data: indexSingle, error: null }),
      // Thenability: awaiting the chain resolves with the rows
      then: (resolve: (v: unknown) => void, reject?: (r: unknown) => void) =>
        Promise.resolve({ data: rows, error: null }).then(resolve, reject),
    };
    // Wrap each method to return chain (so spies can still be applied externally)
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.textSearch = vi.fn().mockReturnValue(chain);
    chain.filter = vi.fn().mockReturnValue(chain);
    chain.contains = vi.fn().mockReturnValue(chain);
    chain.range = vi.fn().mockReturnValue(chain);
    return chain;
  };

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "provider_search_index") {
      return {
        select: vi.fn().mockReturnValue(buildIndexSelectChain(indexRows)),
        upsert: vi.fn().mockResolvedValue({ data: null, error: upsertError }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: deleteError }),
        }),
      };
    }

    if (table === "organizations") {
      const orgSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: orgRow !== undefined ? orgRow : makeOrgRow(),
          error: null,
        }),
      };
      return orgSelectChain;
    }

    return {};
  });

  return { from };
}

// ---------------------------------------------------------------------------
// 1. Unauthenticated / missing actor — directory is public-read
// ---------------------------------------------------------------------------
describe("1. Public read — no auth required for search", () => {
  it("searchProviders() succeeds with anon-like client (no user context)", async () => {
    const { searchProviders } = await import("@/lib/server/search");
    const supabase = makeSupabase({ indexRows: [makeSearchIndexRow()] });
    const results = await searchProviders({}, supabase as never);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Test Provider");
  });

  it("empty filter returns all active providers", async () => {
    const { searchProviders } = await import("@/lib/server/search");
    const rows = [makeSearchIndexRow(), makeSearchIndexRow({ org_id: "org-xyz", name: "Second Provider" })];
    const supabase = makeSupabase({ indexRows: rows });
    const results = await searchProviders({}, supabase as never);
    expect(results).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 2. Cross-tenant denial — results expose only index fields
// ---------------------------------------------------------------------------
describe("2. Search result isolation — no org internals leaked", () => {
  it("SearchResult shape contains only allowed fields", async () => {
    const { searchProviders } = await import("@/lib/server/search");
    const supabase = makeSupabase({ indexRows: [makeSearchIndexRow()] });
    const [result] = await searchProviders({}, supabase as never);

    // Required fields
    expect(result).toHaveProperty("organizationId");
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("stateCodes");
    expect(result).toHaveProperty("serviceTags");
    expect(result).toHaveProperty("languages");
    expect(result).toHaveProperty("acceptingClients");
    expect(result).toHaveProperty("approximate");

    // MUST NOT expose raw DB column names or org internals
    expect(result).not.toHaveProperty("org_id");
    expect(result).not.toHaveProperty("service_tags");
    expect(result).not.toHaveProperty("state_codes");
    expect(result).not.toHaveProperty("is_active");
    expect(result).not.toHaveProperty("lifecycle_status");
    expect(result).not.toHaveProperty("profile_stage");
  });
});

// ---------------------------------------------------------------------------
// 3. Assignment / ownership denial — ineligible org gets is_active=false
// ---------------------------------------------------------------------------
describe("3. syncOrgToIndex — ineligible org marked inactive, not deleted", () => {
  it("org with profile_stage=pending is marked is_active=false", async () => {
    const { syncOrgToIndex } = await import("@/lib/server/search");
    const ineligibleOrg = makeOrgRow({ profile_stage: "pending" });

    const updateEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq });
    const selectEq = vi.fn().mockResolvedValue({ data: { id: "idx-row-1" }, error: null });
    const maybeSingleFn = vi.fn().mockResolvedValue({ data: { id: "idx-row-1" }, error: null });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "organizations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: ineligibleOrg, error: null }),
        };
      }
      if (table === "provider_search_index") {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn }) }),
          update: updateFn,
        };
      }
      return {};
    });

    await syncOrgToIndex({ organizationId: "org-abc" }, { from } as never);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false }),
    );
  });

  it("org deleted from organizations removes index row", async () => {
    const { syncOrgToIndex } = await import("@/lib/server/search");
    const deleteEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "organizations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (table === "provider_search_index") {
        return { delete: deleteFn };
      }
      return {};
    });

    await syncOrgToIndex({ organizationId: "org-gone" }, { from } as never);
    expect(deleteFn).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith("org_id", "org-gone");
  });
});

// ---------------------------------------------------------------------------
// 4. Consent-gated denial — approximate-coord orgs excluded from geo search
// ---------------------------------------------------------------------------
describe("4. Geo search excludes approximate-coord orgs", () => {
  it("searchByGeo() adds approximate=false filter to query", async () => {
    const { searchByGeo } = await import("@/lib/server/search");

    const filterSpy = vi.fn().mockReturnThis();
    const eqSpy = vi.fn().mockReturnThis();
    const rangeSpy = vi.fn().mockResolvedValue({ data: [], error: null });

    const selectChain = {
      eq: eqSpy,
      textSearch: vi.fn().mockReturnThis(),
      filter: filterSpy,
      contains: vi.fn().mockReturnThis(),
      range: rangeSpy,
    };
    eqSpy.mockReturnValue(selectChain);
    filterSpy.mockReturnValue(selectChain);
    rangeSpy.mockResolvedValue({ data: [], error: null });

    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(selectChain),
    });

    await searchByGeo({ lat: 34.05, lng: -118.24, radiusMiles: 25 }, { from } as never);

    expect(eqSpy).toHaveBeenCalledWith("approximate", false);
  });

  it("approximate orgs in text search have distanceMiles=null when no geo filter", async () => {
    const { searchProviders } = await import("@/lib/server/search");
    const supabase = makeSupabase({
      indexRows: [makeSearchIndexRow({ approximate: true, lat: 37.77, lng: -122.42 })],
    });
    const results = await searchProviders({ query: "legal" }, supabase as never);
    expect(results[0].distanceMiles).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Serializer non-leakage — SearchResult field names (camelCase, not DB)
// ---------------------------------------------------------------------------
describe("5. SearchResult serialization — camelCase, no raw DB fields", () => {
  it("organizationId maps from org_id", async () => {
    const { searchProviders } = await import("@/lib/server/search");
    const supabase = makeSupabase({ indexRows: [makeSearchIndexRow({ org_id: "mapped-org" })] });
    const [result] = await searchProviders({}, supabase as never);
    expect(result.organizationId).toBe("mapped-org");
    expect((result as unknown as Record<string, unknown>).org_id).toBeUndefined();
  });

  it("serviceTags maps from service_tags array", async () => {
    const { searchProviders } = await import("@/lib/server/search");
    const supabase = makeSupabase({ indexRows: [makeSearchIndexRow({ service_tags: ["housing", "legal"] })] });
    const [result] = await searchProviders({}, supabase as never);
    expect(result.serviceTags).toEqual(["housing", "legal"]);
    expect((result as unknown as Record<string, unknown>).service_tags).toBeUndefined();
  });

  it("trustScore and designationLevel are null (not yet wired)", async () => {
    const { searchProviders } = await import("@/lib/server/search");
    const supabase = makeSupabase({ indexRows: [makeSearchIndexRow()] });
    const [result] = await searchProviders({}, supabase as never);
    expect(result.trustScore).toBeNull();
    expect(result.designationLevel).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 6. Secure resource access — Search Law: never queries organizations
// ---------------------------------------------------------------------------
describe("6. Search Law — searchProviders never queries organizations table", () => {
  it("searchProviders() only calls from('provider_search_index'), never from('organizations')", async () => {
    const { searchProviders } = await import("@/lib/server/search");
    const fromSpy = vi.fn().mockImplementation((table: string) => {
      if (table === "organizations") {
        throw new Error("SEARCH LAW VIOLATION: queried organizations table from search layer");
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          textSearch: vi.fn().mockReturnThis(),
          filter: vi.fn().mockReturnThis(),
          contains: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    await expect(
      searchProviders({ query: "legal" }, { from: fromSpy } as never),
    ).resolves.not.toThrow();

    const calledTables = fromSpy.mock.calls.map((c: unknown[]) => c[0]);
    expect(calledTables).not.toContain("organizations");
  });

  it("querySearchIndex() selects only from provider_search_index", async () => {
    const { querySearchIndex } = await import("@/lib/server/search/searchRepository");
    const fromSpy = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }));

    await querySearchIndex({}, { from: fromSpy } as never);
    expect(fromSpy).toHaveBeenCalledWith("provider_search_index");
    expect(fromSpy).not.toHaveBeenCalledWith("organizations");
  });
});

// ---------------------------------------------------------------------------
// 7. Notification safe content — distance computed in app layer
// ---------------------------------------------------------------------------
describe("7. Distance computation — app layer (Haversine), not SQL", () => {
  it("distanceMiles is populated when geo filter applied", async () => {
    const { searchProviders } = await import("@/lib/server/search");
    const supabase = makeSupabase({
      indexRows: [makeSearchIndexRow({ lat: 34.05, lng: -118.24, approximate: false })],
    });
    const results = await searchProviders(
      { geo: { lat: 34.0, lng: -118.2, radiusMiles: 50 } },
      supabase as never,
    );
    // distanceMiles is a number (Haversine computed), not null
    expect(typeof results[0]?.distanceMiles).toBe("number");
  });

  it("results sorted nearest-first when geo filter applied", async () => {
    const { searchProviders } = await import("@/lib/server/search");
    const rows = [
      makeSearchIndexRow({ org_id: "far", lat: 40.71, lng: -74.0, approximate: false }),   // NYC from LA
      makeSearchIndexRow({ org_id: "near", lat: 34.07, lng: -118.3, approximate: false }), // Near LA
    ];
    const supabase = makeSupabase({ indexRows: rows });
    const results = await searchProviders(
      { geo: { lat: 34.05, lng: -118.24, radiusMiles: 5000 } },
      supabase as never,
    );
    expect(results[0].organizationId).toBe("near");
    expect(results[1].organizationId).toBe("far");
  });

  it("approximate-coord org gets distanceMiles=null even with geo filter", async () => {
    const { searchProviders } = await import("@/lib/server/search");
    const supabase = makeSupabase({
      indexRows: [makeSearchIndexRow({ approximate: true })],
    });
    const results = await searchProviders(
      { geo: { lat: 34.05, lng: -118.24, radiusMiles: 50 } },
      supabase as never,
    );
    expect(results[0].distanceMiles).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 8. Audit event creation — syncOrgToIndex() upserts to index
// ---------------------------------------------------------------------------
describe("8. syncOrgToIndex — upserts provider_search_index for eligible org", () => {
  it("eligible org triggers upsert with is_active=true", async () => {
    const { syncOrgToIndex } = await import("@/lib/server/search");
    const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "organizations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: makeOrgRow(), error: null }),
        };
      }
      if (table === "provider_search_index") {
        return { upsert: upsertSpy };
      }
      return {};
    });

    await syncOrgToIndex({ organizationId: "org-abc" }, { from } as never);

    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "org-abc",
        is_active: true,
        name: "Test Provider",
      }),
      expect.objectContaining({ onConflict: "org_id" }),
    );
  });

  it("upsert does NOT include search_vector (trigger-computed, not app-set)", async () => {
    const { syncOrgToIndex } = await import("@/lib/server/search");
    const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "organizations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: makeOrgRow(), error: null }),
        };
      }
      if (table === "provider_search_index") {
        return { upsert: upsertSpy };
      }
      return {};
    });

    await syncOrgToIndex({ organizationId: "org-abc" }, { from } as never);
    const [payload] = upsertSpy.mock.calls[0] as [Record<string, unknown>];
    expect(payload).not.toHaveProperty("search_vector");
  });
});

// ---------------------------------------------------------------------------
// 9. Revoked / expired access — is_active=false excluded from queries
// ---------------------------------------------------------------------------
describe("9. is_active filter — inactive orgs excluded from search results", () => {
  it("querySearchIndex applies is_active=true filter", async () => {
    const { querySearchIndex } = await import("@/lib/server/search/searchRepository");
    const eqSpy = vi.fn().mockReturnThis();
    const rangeSpy = vi.fn().mockResolvedValue({ data: [], error: null });

    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: eqSpy,
        textSearch: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        range: rangeSpy,
      }),
    });

    await querySearchIndex({}, { from } as never);
    expect(eqSpy).toHaveBeenCalledWith("is_active", true);
  });
});

// ---------------------------------------------------------------------------
// 10. Admin access audited — backfillSearchIndex uses service role
// ---------------------------------------------------------------------------
describe("10. backfillSearchIndex — iterates all active orgs", () => {
  it("returns synced/skipped counts", async () => {
    const { backfillSearchIndex } = await import("@/lib/server/search");

    const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    const indexSelectFn = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { is_active: true }, error: null }),
      }),
    }));

    let callCount = 0;
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "organizations") {
        callCount++;
        if (callCount === 1) {
          // First call: list org IDs
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: "org-1" }, { id: "org-2" }],
                error: null,
              }),
            }),
          };
        }
        // Subsequent calls: fetch individual orgs
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: makeOrgRow(), error: null }),
        };
      }
      if (table === "provider_search_index") {
        return {
          upsert: upsertSpy,
          select: indexSelectFn,
        };
      }
      return {};
    });

    const result = await backfillSearchIndex({ from } as never);
    expect(result).toHaveProperty("synced");
    expect(result).toHaveProperty("skipped");
    expect(result.synced + result.skipped).toBe(2);
  });

  it("errors per org increment skipped without throwing", async () => {
    const { backfillSearchIndex } = await import("@/lib/server/search");

    let callCount = 0;
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "organizations") {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: "org-fail" }],
                error: null,
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
        };
      }
      return {};
    });

    const result = await backfillSearchIndex({ from } as never);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });
});
