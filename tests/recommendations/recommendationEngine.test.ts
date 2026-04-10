/**
 * Domain 5.2 — Recommendation engine integration tests (3 tests)
 *
 * Exercises the engine through the mocked search module to verify:
 *   - Location-based filtering (results in applicant's state returned first)
 *   - Intake category matching (matching service tags narrow candidates)
 *   - Search Law: fetchCandidateResources delegates to searchProviders
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SearchResult } from "@/lib/server/search/searchTypes";
import type { RecommendationContext } from "@/lib/server/recommendations/recommendationTypes";

vi.mock("@/lib/server/search/searchService", () => ({
  searchProviders: vi.fn(),
}));

import {
  fetchCandidateResources,
  categoriesToServiceTags,
  inferCategory,
} from "@/lib/server/recommendations/recommendationEngine";
import * as searchModule from "@/lib/server/search/searchService";

function mockResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    organizationId: "org-1",
    name: "Test Org",
    description: null,
    distanceMiles: null,
    approximate: false,
    trustScore: null,
    designationLevel: null,
    stateCodes: ["IL"],
    serviceTags: ["legal_aid"],
    languages: ["en"],
    acceptingClients: true,
    capacityStatus: null,
    lat: null,
    lng: null,
    ...overrides,
  };
}

function mockContext(overrides: Partial<RecommendationContext> = {}): RecommendationContext {
  return {
    userId: "u",
    accountType: "applicant",
    location: { stateCode: "IL", lat: null, lng: null },
    intakeSignals: { serviceTags: [], categories: [], preferredLanguage: null },
    caseId: null,
    workflowState: null,
    excludedProviderIds: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recommendation engine integration", () => {
  it("location-based filtering: IL context passes state filter to search module", async () => {
    vi.mocked(searchModule.searchProviders).mockResolvedValue([
      mockResult({ organizationId: "org-IL", stateCodes: ["IL"] }),
    ]);

    const ctx = mockContext({ location: { stateCode: "IL", lat: null, lng: null } });
    const candidates = await fetchCandidateResources(ctx, {} as never);

    expect(searchModule.searchProviders).toHaveBeenCalledTimes(1);
    const call = vi.mocked(searchModule.searchProviders).mock.calls[0];
    const filter = call[0];
    expect(filter.stateCodes).toEqual(["IL"]);
    expect(candidates[0].organizationId).toBe("org-IL");
  });

  it("intake category matching: legal category produces legal_aid service tag filter", async () => {
    vi.mocked(searchModule.searchProviders).mockResolvedValue([
      mockResult({
        organizationId: "org-legal",
        serviceTags: ["legal_aid", "civil_legal"],
      }),
    ]);

    const ctx = mockContext({
      intakeSignals: {
        serviceTags: [],
        categories: ["legal"],
        preferredLanguage: null,
      },
    });
    const candidates = await fetchCandidateResources(ctx, {} as never);

    const call = vi.mocked(searchModule.searchProviders).mock.calls[0];
    const filter = call[0];
    expect(filter.serviceTags).toContain("legal_aid");
    expect(candidates[0].matchedTags).toContain("legal_aid");
  });

  it("categoriesToServiceTags + inferCategory round-trip: legal → legal_aid → legal", () => {
    const tags = categoriesToServiceTags(["legal"]);
    expect(tags).toContain("legal_aid");
    const cat = inferCategory({
      organizationId: "x",
      name: "X",
      description: null,
      stateCodes: [],
      serviceTags: ["legal_aid"],
      languages: [],
      acceptingClients: true,
      capacityStatus: null,
      distanceMiles: null,
      reliabilityTier: "emerging",
      matchedTags: [],
    });
    expect(cat).toBe("legal");
  });
});
