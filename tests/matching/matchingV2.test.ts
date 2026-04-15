/**
 * Domain 3.4 — Matching engine V2 tests.
 *
 * Covers the factor-based spec:
 *   - Weights sum to exactly 1.0
 *   - Each factor computed independently
 *   - Hard filters exclude availability=0 or serviceFit=0 orgs
 *   - Geography expansion fires when < 3 orgs pass
 *   - Grassroots and social-service orgs are in separate arrays, never merged
 *   - data_pending qualityBoost = 0.50 (same as developing)
 */

import { describe, it, expect } from "vitest";
import {
  evaluateOrg,
  rankOrgs,
  computeMatchScore,
  computeQualityBoost,
  MATCH_WEIGHTS,
  QUALITY_TIER_BOOST,
  type OrgForMatching,
  type IntakeMatchProfile,
} from "@/lib/server/matching/v2";

function makeIntake(overrides: Partial<IntakeMatchProfile> = {}): IntakeMatchProfile {
  return {
    serviceTypesNeeded: ["legal_aid"],
    crimeType: "domestic_violence",
    locationZip: "60601",
    locationCounty: "Cook",
    radiusKm: 50,
    languagePreference: "en",
    requiresLanguageMatch: false,
    ...overrides,
  };
}

function makeOrg(overrides: Partial<OrgForMatching> = {}): OrgForMatching {
  return {
    id: "org-1",
    orgTierType: "tier_2_social_service_agency",
    serviceTypes: ["legal_aid", "case_management"],
    programTypes: ["dv"],
    coverageZips: ["60601", "60602"],
    coverageCounties: ["Cook"],
    coverageStates: ["IL"],
    acceptingClients: true,
    capacityStatus: "open",
    languages: ["en", "es"],
    verifiedLanguages: ["en"],
    distanceKm: 5,
    qualityTier: "established",
    ...overrides,
  };
}

describe("V2 matching — weight formula", () => {
  it("weights sum to exactly 1.0", () => {
    const total =
      MATCH_WEIGHTS.serviceFit +
      MATCH_WEIGHTS.availability +
      MATCH_WEIGHTS.qualityBoost +
      MATCH_WEIGHTS.languageMatch +
      MATCH_WEIGHTS.geography;
    expect(total).toBeCloseTo(1.0, 10);
  });

  it("computeMatchScore applies the canonical formula", () => {
    const score = computeMatchScore({
      serviceFit: 1,
      availability: 1,
      qualityBoost: 1,
      languageMatch: 1,
      geography: 1,
    });
    expect(score).toBeCloseTo(1.0, 10);
  });

  it("computeMatchScore with zeros returns 0", () => {
    const score = computeMatchScore({
      serviceFit: 0,
      availability: 0,
      qualityBoost: 0,
      languageMatch: 0,
      geography: 0,
    });
    expect(score).toBe(0);
  });
});

describe("V2 matching — quality_boost tier mapping", () => {
  it("comprehensive → 1.0", () => {
    expect(QUALITY_TIER_BOOST.comprehensive).toBe(1.0);
    expect(computeQualityBoost("comprehensive")).toBe(1.0);
  });
  it("established → 0.75", () => {
    expect(computeQualityBoost("established")).toBe(0.75);
  });
  it("developing → 0.50", () => {
    expect(computeQualityBoost("developing")).toBe(0.5);
  });
  it("data_pending → 0.50 (NEVER zero, NEVER penalized)", () => {
    expect(QUALITY_TIER_BOOST.data_pending).toBe(0.5);
    expect(computeQualityBoost("data_pending")).toBe(0.5);
  });
  it("null tier (no data yet) → 0.50", () => {
    expect(computeQualityBoost(null)).toBe(0.5);
  });
});

describe("V2 matching — per-factor evaluation", () => {
  it("serviceFit = 1.0 when all needs met + coverage bonus capped", () => {
    const intake = makeIntake({ serviceTypesNeeded: ["legal_aid"] });
    const r = evaluateOrg(makeOrg(), intake);
    expect(r.factors.serviceFit).toBe(1);
  });

  it("serviceFit = 0 when zero overlap → flagged for hard filter", () => {
    const intake = makeIntake({ serviceTypesNeeded: ["financial_aid"] });
    const r = evaluateOrg(makeOrg({ serviceTypes: ["legal_aid"] }), intake);
    expect(r.factors.serviceFit).toBe(0);
    expect(r.isFiltered).toBe(true);
    expect(r.filterReason).toBe("service_fit_zero");
  });

  it("availability = 1.0 when accepting + open", () => {
    const r = evaluateOrg(
      makeOrg({ acceptingClients: true, capacityStatus: "open" }),
      makeIntake(),
    );
    expect(r.factors.availability).toBe(1);
  });

  it("availability = 0.6 when limited", () => {
    const r = evaluateOrg(makeOrg({ capacityStatus: "limited" }), makeIntake());
    expect(r.factors.availability).toBe(0.6);
  });

  it("availability = 0 when paused → flagged for hard filter", () => {
    const r = evaluateOrg(makeOrg({ capacityStatus: "paused" }), makeIntake());
    expect(r.factors.availability).toBe(0);
    expect(r.isFiltered).toBe(true);
    expect(r.filterReason).toBe("availability_zero");
  });

  it("availability = 0 when not accepting → flagged for hard filter", () => {
    const r = evaluateOrg(makeOrg({ acceptingClients: false }), makeIntake());
    expect(r.factors.availability).toBe(0);
    expect(r.isFiltered).toBe(true);
  });

  it("languageMatch = 1.0 only when verified", () => {
    const intake = makeIntake({ requiresLanguageMatch: true, languagePreference: "es" });
    const r = evaluateOrg(
      makeOrg({ languages: ["en", "es"], verifiedLanguages: ["en", "es"] }),
      intake,
    );
    expect(r.factors.languageMatch).toBe(1);
  });

  it("languageMatch = 0.5 when listed but unverified", () => {
    const intake = makeIntake({ requiresLanguageMatch: true, languagePreference: "es" });
    const r = evaluateOrg(
      makeOrg({ languages: ["es"], verifiedLanguages: [] }),
      intake,
    );
    expect(r.factors.languageMatch).toBe(0.5);
  });

  it("languageMatch = 0.5 when no language required (neutral)", () => {
    const r = evaluateOrg(makeOrg(), makeIntake({ requiresLanguageMatch: false }));
    expect(r.factors.languageMatch).toBe(0.5);
  });

  it("geography = 1.0 within radiusKm", () => {
    const r = evaluateOrg(makeOrg({ distanceKm: 20 }), makeIntake({ radiusKm: 50 }));
    expect(r.factors.geography).toBe(1);
  });

  it("geography = 0.5 within 2× radiusKm", () => {
    const r = evaluateOrg(
      makeOrg({ distanceKm: 80, coverageZips: [], coverageCounties: [] }),
      makeIntake({ radiusKm: 50, originLat: 1, originLng: 1 }),
    );
    expect(r.factors.geography).toBe(0.5);
  });

  it("geography = 0 beyond 2× radiusKm when origin known", () => {
    const r = evaluateOrg(
      makeOrg({ distanceKm: 200, coverageZips: [], coverageCounties: [] }),
      makeIntake({ radiusKm: 50, originLat: 1, originLng: 1 }),
    );
    expect(r.factors.geography).toBe(0);
  });
});

describe("V2 matching — rank: cohort separation + expansion", () => {
  const intake = makeIntake();

  it("grassroots and social-service results are in separate arrays", () => {
    const orgs: OrgForMatching[] = [
      makeOrg({ id: "grass-a", orgTierType: "tier_1_grassroots" }),
      makeOrg({ id: "grass-b", orgTierType: "tier_1_grassroots" }),
      makeOrg({ id: "ssa-a", orgTierType: "tier_2_social_service_agency" }),
      makeOrg({ id: "ssa-b", orgTierType: "tier_2_social_service_agency" }),
    ];
    const set = rankOrgs(orgs, intake);
    expect(set.grassroots.map((r) => r.organizationId).sort()).toEqual([
      "grass-a",
      "grass-b",
    ]);
    expect(set.socialService.map((r) => r.organizationId).sort()).toEqual([
      "ssa-a",
      "ssa-b",
    ]);
  });

  it("hard-filtered orgs are excluded from both arrays", () => {
    const orgs: OrgForMatching[] = [
      makeOrg({ id: "ok", capacityStatus: "open" }),
      makeOrg({ id: "paused", capacityStatus: "paused" }),
      makeOrg({ id: "no-service", serviceTypes: ["unrelated"] }),
      makeOrg({ id: "also-ok", capacityStatus: "limited" }),
    ];
    const set = rankOrgs(orgs, intake);
    const ids = [...set.grassroots, ...set.socialService].map((r) => r.organizationId);
    expect(ids).toContain("ok");
    expect(ids).toContain("also-ok");
    expect(ids).not.toContain("paused");
    expect(ids).not.toContain("no-service");
  });

  it("geography expansion fires when fewer than 3 orgs pass", () => {
    // All orgs just outside the radius: none pass first evaluation, but with
    // 1.5× expansion the distance fits within 2× — they pass.
    const orgs: OrgForMatching[] = [
      makeOrg({
        id: "far-1",
        coverageZips: [],
        coverageCounties: [],
        distanceKm: 80,
      }),
      makeOrg({
        id: "far-2",
        coverageZips: [],
        coverageCounties: [],
        distanceKm: 80,
      }),
    ];
    const set = rankOrgs(orgs, makeIntake({ radiusKm: 50, originLat: 1, originLng: 1 }));
    expect(set.geographyExpanded).toBe(true);
  });

  it("results within each cohort are sorted by matchScore descending", () => {
    const orgs: OrgForMatching[] = [
      makeOrg({ id: "low", qualityTier: "developing" }),
      makeOrg({ id: "high", qualityTier: "comprehensive" }),
      makeOrg({ id: "mid", qualityTier: "established" }),
    ];
    const set = rankOrgs(orgs, intake);
    const ids = set.socialService.map((r) => r.organizationId);
    expect(ids[0]).toBe("high");
    expect(ids[2]).toBe("low");
  });

  it("matchScore is always in [0, 1]", () => {
    const orgs: OrgForMatching[] = [
      makeOrg(),
      makeOrg({ qualityTier: "data_pending" }),
      makeOrg({ qualityTier: null }),
      makeOrg({ capacityStatus: "waitlist" }),
    ];
    const set = rankOrgs(orgs, intake);
    for (const r of [...set.grassroots, ...set.socialService]) {
      expect(r.matchScore).toBeGreaterThanOrEqual(0);
      expect(r.matchScore).toBeLessThanOrEqual(1);
    }
  });
});
