/**
 * Domain 6.1 — Trust query / version scope tests (4 tests)
 *
 * Asserts query scoping rules and historical methodology linkage.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({}) as never,
}));

vi.mock("@/lib/server/trust/trustRepository", () => ({
  getActiveMethodology: vi.fn(),
  getMethodologyById: vi.fn(),
  insertMethodology: vi.fn(),
  listMethodologies: vi.fn(),
  setMethodologyStatus: vi.fn(),
  updateMethodologyDraft: vi.fn(),
  insertSnapshot: vi.fn(),
  getSnapshotById: vi.fn(),
  getLatestSnapshotForOrg: vi.fn(),
  listSnapshotsForOrg: vi.fn(),
  insertScoreInputs: vi.fn(),
  getInputsForSnapshot: vi.fn(),
  insertReliabilitySummary: vi.fn(),
  getCurrentReliabilitySummary: vi.fn(),
  insertDispute: vi.fn(),
  getDisputeById: vi.fn(),
  updateDispute: vi.fn(),
  insertAffiliation: vi.fn(),
  getCurrentAffiliation: vi.fn(),
  updateSearchIndexReliabilityTier: vi.fn(),
  getTrustSignalAggregates: vi.fn().mockResolvedValue([]),
}));

import * as repo from "@/lib/server/trust/trustRepository";
import { resolveApplicantSafeTrustSurface } from "@/lib/server/trust/providerReliabilityService";
import {
  serializeForApplicant,
  serializeForProvider,
  serializeForAgency,
} from "@/lib/server/trust/trustSerializer";
import type {
  ProviderReliabilitySummary,
  ProviderScoreSnapshot,
} from "@/lib/server/trust/trustTypes";

function mockSnapshot(
  overrides: Partial<ProviderScoreSnapshot> = {},
): ProviderScoreSnapshot {
  return {
    id: "snap-1",
    organizationId: "org-1",
    methodologyId: "m-1",
    methodologyVersion: "1.0.0",
    categoryScores: { responsiveness: 0.5 },
    weightedComposite: 0.7,
    scoreStatus: "computed",
    calcMetadata: {},
    computedAt: "2026-04-09T00:00:00Z",
    createdAt: "2026-04-09T00:00:00Z",
    ...overrides,
  };
}

function mockSummary(
  overrides: Partial<ProviderReliabilitySummary> = {},
): ProviderReliabilitySummary {
  return {
    id: "rs-1",
    organizationId: "org-1",
    snapshotId: "snap-1",
    reliabilityTier: "established",
    highlights: ["Strong responsiveness signals (50%)."],
    availabilitySummary: null,
    languageSummary: null,
    freshness: "2026-04-09T00:00:00Z",
    isCurrent: true,
    computedAt: "2026-04-09T00:00:00Z",
    createdAt: "2026-04-09T00:00:00Z",
    updatedAt: "2026-04-09T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("trust query / version scope", () => {
  it("applicant scope: resolveApplicantSafeTrustSurface returns tier + freshness only", async () => {
    vi.mocked(repo.getCurrentReliabilitySummary).mockResolvedValueOnce(mockSummary());
    const surface = await resolveApplicantSafeTrustSurface("org-1");
    // Applicant-safe surface contract: tier + freshness, nothing else.
    expect(Object.keys(surface).sort()).toEqual(["freshness", "tier"]);
    expect(surface.tier).toBe("established");
  });

  it("applicant scope returns 'unverified' tier when no summary exists", async () => {
    vi.mocked(repo.getCurrentReliabilitySummary).mockResolvedValueOnce(null);
    const surface = await resolveApplicantSafeTrustSurface("org-unknown");
    expect(surface.tier).toBe("unverified");
    expect(surface.freshness).toBeNull();
  });

  it("provider internal scope is org-scoped (snapshot belongs to one org)", () => {
    const snap = mockSnapshot({ organizationId: "org-a" });
    const view = serializeForProvider(snap);
    // The serialized view carries the org id so callers can guard cross-tenant.
    expect(view.organizationId).toBe("org-a");
    // Field set is fixed — no other org's data should be shaped through here.
    expect(Object.keys(view)).toContain("weightedComposite");
    expect(Object.keys(view)).toContain("categoryScores");
  });

  it("agency comparative scope preserves methodology version linkage on historical snapshots", () => {
    const oldSnap = mockSnapshot({
      id: "snap-old",
      methodologyVersion: "1.0.0",
      computedAt: "2026-03-01T00:00:00Z",
    });
    const newSnap = mockSnapshot({
      id: "snap-new",
      methodologyVersion: "2.0.0",
      computedAt: "2026-04-09T00:00:00Z",
    });
    const oldView = serializeForAgency({
      snapshot: oldSnap,
      summary: mockSummary({ snapshotId: "snap-old" }),
    });
    const newView = serializeForAgency({
      snapshot: newSnap,
      summary: mockSummary({ snapshotId: "snap-new" }),
    });
    expect(oldView.methodologyVersion).toBe("1.0.0");
    expect(newView.methodologyVersion).toBe("2.0.0");
    // Different snapshots, different methodology versions retained — historical linkage.
    expect(oldView.methodologyVersion).not.toBe(newView.methodologyVersion);
  });

  it("applicant view excludes methodology id even via JSON inspection", () => {
    const view = serializeForApplicant(mockSummary());
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/methodology/);
    expect(json).not.toMatch(/snapshotId/i);
  });
});
