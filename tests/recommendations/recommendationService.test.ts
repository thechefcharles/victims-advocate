/**
 * Domain 5.2 — Recommendation service tests (5 tests)
 *
 * Uses vi.mock to stub the search module so the tests never hit Supabase.
 * Asserts: ordering, context assembly, cache stale path, ranked output shape.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SearchResult } from "@/lib/server/search/searchTypes";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";

// Mock the search service so fetchCandidateResources has deterministic output.
vi.mock("@/lib/server/search/searchService", () => ({
  searchProviders: vi.fn(),
}));

// Mock supabaseAdmin — service calls maybeSingle on profile/intake/cases,
// each returning null so buildRecommendationContext degrades cleanly.
vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

import {
  generateRecommendations,
  buildRecommendationContext,
  candidateToItem,
} from "@/lib/server/recommendations/recommendationService";
import {
  getCachedRecommendations,
} from "@/lib/server/recommendations/recommendationRepository";
import { rankRecommendations } from "@/lib/server/recommendations/recommendationEngine";
import * as searchModule from "@/lib/server/search/searchService";
import type { CandidateResource } from "@/lib/server/recommendations/recommendationTypes";

function mockResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    organizationId: "org-1",
    name: "Test Org",
    description: "desc",
    distanceMiles: null,
    approximate: false,
    trustScore: null,
    designationLevel: null,
    stateCodes: ["IL"],
    serviceTags: ["legal_aid"],
    languages: ["en"],
    acceptingClients: true,
    capacityStatus: "accepting",
    lat: null,
    lng: null,
    ...overrides,
  };
}

function makeActor(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    userId: "user-1",
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recommendation service", () => {
  it("generateRecommendations returns ordered set with setId, items, and reasons", async () => {
    vi.mocked(searchModule.searchProviders).mockResolvedValue([
      mockResult({ organizationId: "org-1", name: "Alpha", acceptingClients: true }),
      mockResult({ organizationId: "org-2", name: "Beta", acceptingClients: false }),
    ]);

    const set = await generateRecommendations({ actor: makeActor() });
    expect(set.setId).toBeTruthy();
    expect(set.userId).toBe("user-1");
    expect(set.items.length).toBe(2);
    expect(set.items[0].reason).toBeTruthy();
    expect(set.items[0].reasonCode).toBeTruthy();
    // Accepting-clients org ranks above non-accepting at same tier.
    expect(set.items[0].resourceId).toBe("org-1");
  });

  it("buildRecommendationContext produces a safe empty context when no profile/intake exist", async () => {
    const ctx = await buildRecommendationContext(makeActor());
    expect(ctx.userId).toBe("user-1");
    expect(ctx.location.stateCode).toBeNull();
    expect(ctx.intakeSignals.categories).toEqual([]);
    expect(ctx.excludedProviderIds).toEqual([]);
    expect(ctx.caseId).toBeNull();
  });

  it("generateRecommendations queries search module (never organizations) and excludes providers by id", async () => {
    vi.mocked(searchModule.searchProviders).mockResolvedValue([
      mockResult({ organizationId: "org-1" }),
      mockResult({ organizationId: "org-excluded" }),
    ]);

    const set = await generateRecommendations({
      actor: makeActor(),
      contextInput: { excludedProviderIds: ["org-excluded"] },
    });
    // Confirms delegation to the Domain 0.6 search module (which hits
    // provider_search_index, never organizations).
    expect(searchModule.searchProviders).toHaveBeenCalledTimes(1);
    expect(set.items.map((i) => i.resourceId)).toEqual(["org-1"]);
  });

  it("rankRecommendations orders by reliability tier, then match count, then name", () => {
    const cands: CandidateResource[] = [
      {
        organizationId: "c",
        name: "Charlie",
        description: null,
        stateCodes: ["IL"],
        serviceTags: ["legal_aid"],
        languages: ["en"],
        acceptingClients: true,
        capacityStatus: null,
        distanceMiles: null,
        reliabilityTier: "emerging",
        matchedTags: [],
      },
      {
        organizationId: "a",
        name: "Alpha",
        description: null,
        stateCodes: ["IL"],
        serviceTags: ["legal_aid", "housing"],
        languages: ["en"],
        acceptingClients: true,
        capacityStatus: null,
        distanceMiles: null,
        reliabilityTier: "verified",
        matchedTags: ["legal_aid", "housing"],
      },
      {
        organizationId: "b",
        name: "Bravo",
        description: null,
        stateCodes: ["IL"],
        serviceTags: ["legal_aid"],
        languages: ["en"],
        acceptingClients: true,
        capacityStatus: null,
        distanceMiles: null,
        reliabilityTier: "verified",
        matchedTags: ["legal_aid"],
      },
    ];
    const ranked = rankRecommendations(cands, {
      userId: "u",
      accountType: "applicant",
      location: { stateCode: null, lat: null, lng: null },
      intakeSignals: { serviceTags: [], categories: [], preferredLanguage: null },
      caseId: null,
      workflowState: null,
      excludedProviderIds: [],
    });
    // Alpha (verified, 2 matches) > Bravo (verified, 1 match) > Charlie (emerging)
    expect(ranked.map((c) => c.organizationId)).toEqual(["a", "b", "c"]);
  });

  it("getCachedRecommendations returns null in v1 (cache deferred) — generation still runs", async () => {
    const cached = await getCachedRecommendations("user-1", "hash-abc", {} as never);
    expect(cached).toBeNull();

    // Service still works when cache returns null.
    vi.mocked(searchModule.searchProviders).mockResolvedValue([mockResult()]);
    const set = await generateRecommendations({ actor: makeActor() });
    expect(set.items.length).toBeGreaterThan(0);
  });

  it("candidateToItem assigns priority by rank position (top-3 high, 3–7 medium, 8+ low)", () => {
    const cand: CandidateResource = {
      organizationId: "o",
      name: "O",
      description: null,
      stateCodes: ["IL"],
      serviceTags: [],
      languages: [],
      acceptingClients: true,
      capacityStatus: null,
      distanceMiles: null,
      reliabilityTier: "emerging",
      matchedTags: [],
    };
    const ctx = {
      userId: "u",
      accountType: "applicant" as const,
      location: { stateCode: null, lat: null, lng: null },
      intakeSignals: { serviceTags: [], categories: [], preferredLanguage: null },
      caseId: null,
      workflowState: null,
      excludedProviderIds: [],
    };
    expect(candidateToItem(cand, ctx, 0).priority).toBe("high");
    expect(candidateToItem(cand, ctx, 5).priority).toBe("medium");
    expect(candidateToItem(cand, ctx, 10).priority).toBe("low");
  });
});
