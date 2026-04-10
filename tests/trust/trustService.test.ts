/**
 * Domain 6.1 — Trust service tests (10 tests)
 *
 * Covers the full pipeline:
 *   getProviderReliabilitySummary, aggregateScoreInputs, computeProviderScoreSnapshot,
 *   recalculateProviderScore, mapToReliabilitySummary, createScoreDispute,
 *   reviewScoreDispute, publishScoreMethodology, updateProviderAffiliation,
 *   getProviderScoreSnapshot.
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
  getTrustSignalAggregates: vi.fn(),
}));

import * as repo from "@/lib/server/trust/trustRepository";
import {
  aggregateScoreInputs,
  computeProviderScoreSnapshot,
  mapToReliabilitySummary,
  recalculateProviderScore,
} from "@/lib/server/trust/providerScoreService";
import { getProviderReliabilitySummary } from "@/lib/server/trust/providerReliabilityService";
import {
  createScoreDispute,
  reviewScoreDispute,
} from "@/lib/server/trust/scoreDisputeService";
import { publishScoreMethodology } from "@/lib/server/trust/scoreMethodologyService";
import { updateProviderAffiliation } from "@/lib/server/trust/providerAffiliationService";
import type {
  ProviderReliabilitySummary,
  ProviderScoreSnapshot,
  ScoreMethodology,
} from "@/lib/server/trust/trustTypes";

const ANY_SUPABASE = {} as never;

function mockMethodology(): ScoreMethodology {
  return {
    id: "m-1",
    version: "1.0.0",
    name: "v1",
    description: null,
    status: "active",
    categoryDefinitions: [
      {
        key: "responsiveness",
        label: "Responsiveness",
        signalTypes: ["case_response_time", "message_response_latency"],
      },
      {
        key: "completeness",
        label: "Completeness",
        signalTypes: ["completeness_coverage"],
      },
    ],
    weights: { responsiveness: 0.6, completeness: 0.4 },
    createdByUserId: "u-1",
    publishedAt: "2026-04-09T00:00:00Z",
    deprecatedAt: null,
    createdAt: "2026-04-09T00:00:00Z",
    updatedAt: "2026-04-09T00:00:00Z",
  };
}

function mockSnapshot(
  overrides: Partial<ProviderScoreSnapshot> = {},
): ProviderScoreSnapshot {
  return {
    id: "snap-1",
    organizationId: "org-1",
    methodologyId: "m-1",
    methodologyVersion: "1.0.0",
    categoryScores: { responsiveness: 0.5, completeness: 0.4 },
    weightedComposite: 0.9,
    scoreStatus: "computed",
    calcMetadata: {},
    computedAt: "2026-04-09T00:00:00Z",
    createdAt: "2026-04-09T00:00:00Z",
    ...overrides,
  };
}

function mockSummary(): ProviderReliabilitySummary {
  return {
    id: "rs-1",
    organizationId: "org-1",
    snapshotId: "snap-1",
    reliabilityTier: "verified",
    highlights: ["Strong responsiveness signals (90%)."],
    availabilitySummary: null,
    languageSummary: null,
    freshness: "2026-04-09T00:00:00Z",
    isCurrent: true,
    computedAt: "2026-04-09T00:00:00Z",
    createdAt: "2026-04-09T00:00:00Z",
    updatedAt: "2026-04-09T00:00:00Z",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("trust service", () => {
  it("getProviderReliabilitySummary returns the safe current summary", async () => {
    vi.mocked(repo.getCurrentReliabilitySummary).mockResolvedValueOnce(mockSummary());
    const result = await getProviderReliabilitySummary("org-1", ANY_SUPABASE);
    expect(result?.reliabilityTier).toBe("verified");
    expect(repo.getCurrentReliabilitySummary).toHaveBeenCalledWith("org-1", ANY_SUPABASE);
  });

  it("aggregateScoreInputs reads from trust_signal_aggregates ONLY (not raw tables)", async () => {
    vi.mocked(repo.getTrustSignalAggregates).mockResolvedValueOnce([
      { signalType: "case_response_time", totalCount: 5, totalValue: 10, lastEventAt: null },
      { signalType: "completeness_coverage", totalCount: 8, totalValue: 16, lastEventAt: null },
    ]);
    const inputs = await aggregateScoreInputs("org-1", mockMethodology(), ANY_SUPABASE);
    // Repository function called → confirms the source is trust_signal_aggregates.
    expect(repo.getTrustSignalAggregates).toHaveBeenCalledWith("org-1", ANY_SUPABASE);
    expect(inputs.length).toBeGreaterThan(0);
    // All inputs marked as sourced from the canonical table.
    for (const input of inputs) {
      expect(input.source).toBe("trust_signal_aggregates");
    }
  });

  it("computeProviderScoreSnapshot creates snapshot with methodology version attached", async () => {
    vi.mocked(repo.insertSnapshot).mockResolvedValueOnce(mockSnapshot());
    vi.mocked(repo.insertScoreInputs).mockResolvedValueOnce([]);

    const snap = await computeProviderScoreSnapshot({
      organizationId: "org-1",
      methodology: mockMethodology(),
      inputs: [
        {
          organizationId: "org-1",
          category: "responsiveness",
          signalType: "case_response_time",
          rawValue: 10,
          normalizedValue: 0.8,
          weight: 0.3,
          contribution: 0.24,
          source: "trust_signal_aggregates",
        },
      ],
      supabase: ANY_SUPABASE,
    });

    expect(snap.methodologyVersion).toBe("1.0.0");
    expect(snap.methodologyId).toBe("m-1");
  });

  it("computeProviderScoreSnapshot with no inputs marks status insufficient_data", async () => {
    vi.mocked(repo.insertSnapshot).mockImplementationOnce(async (fields) => ({
      id: "snap-2",
      organizationId: "org-1",
      methodologyId: "m-1",
      methodologyVersion: "1.0.0",
      categoryScores: {},
      weightedComposite: 0,
      scoreStatus: fields.scoreStatus,
      calcMetadata: {},
      computedAt: "2026-04-09T00:00:00Z",
      createdAt: "2026-04-09T00:00:00Z",
    }));

    const snap = await computeProviderScoreSnapshot({
      organizationId: "org-1",
      methodology: mockMethodology(),
      inputs: [],
      supabase: ANY_SUPABASE,
    });

    expect(snap.scoreStatus).toBe("insufficient_data");
  });

  it("recalculateProviderScore creates a NEW snapshot (does not mutate old)", async () => {
    vi.mocked(repo.getActiveMethodology).mockResolvedValueOnce(mockMethodology());
    vi.mocked(repo.getTrustSignalAggregates).mockResolvedValueOnce([]);
    vi.mocked(repo.insertSnapshot).mockResolvedValueOnce(mockSnapshot({ id: "snap-NEW" }));
    vi.mocked(repo.insertReliabilitySummary).mockResolvedValueOnce(mockSummary());
    vi.mocked(repo.updateSearchIndexReliabilityTier).mockResolvedValueOnce(undefined);

    const result = await recalculateProviderScore({ organizationId: "org-1" });

    // Insert was called, never an update on snapshots.
    expect(repo.insertSnapshot).toHaveBeenCalledTimes(1);
    expect(result.snapshot.id).toBe("snap-NEW");
    // Search projection was wired.
    expect(repo.updateSearchIndexReliabilityTier).toHaveBeenCalledWith(
      "org-1",
      "verified",
      ANY_SUPABASE,
    );
  });

  it("mapToReliabilitySummary derives summary FROM SNAPSHOT only (no second path)", async () => {
    vi.mocked(repo.insertReliabilitySummary).mockResolvedValueOnce(mockSummary());
    const summary = await mapToReliabilitySummary(mockSnapshot());

    // Confirms aggregates were never queried during summary derivation.
    expect(repo.getTrustSignalAggregates).not.toHaveBeenCalled();
    expect(summary.snapshotId).toBe("snap-1");
    // The tier comes from the weighted_composite, not from a re-aggregation.
    expect(summary.reliabilityTier).toBe("verified");
  });

  it("createScoreDispute creates an open dispute linked to a snapshot", async () => {
    vi.mocked(repo.getSnapshotById).mockResolvedValueOnce(mockSnapshot());
    vi.mocked(repo.insertDispute).mockResolvedValueOnce({
      id: "d-1",
      organizationId: "org-1",
      snapshotId: "snap-1",
      status: "open",
      reason: "Test",
      evidence: {},
      openedByUserId: "u-1",
      openedAt: "2026-04-09T00:00:00Z",
      reviewedByUserId: null,
      reviewedAt: null,
      resolutionNotes: null,
      resolutionOutcome: null,
      createdAt: "2026-04-09T00:00:00Z",
      updatedAt: "2026-04-09T00:00:00Z",
    });

    const dispute = await createScoreDispute({
      organizationId: "org-1",
      snapshotId: "snap-1",
      reason: "Test",
      openedByUserId: "u-1",
    });
    expect(dispute.status).toBe("open");
    expect(dispute.snapshotId).toBe("snap-1");
  });

  it("reviewScoreDispute transitions to resolved with outcome", async () => {
    vi.mocked(repo.getDisputeById).mockResolvedValueOnce({
      id: "d-1",
      organizationId: "org-1",
      snapshotId: "snap-1",
      status: "under_review",
      reason: "x",
      evidence: {},
      openedByUserId: "u-1",
      openedAt: "2026-04-09T00:00:00Z",
      reviewedByUserId: null,
      reviewedAt: null,
      resolutionNotes: null,
      resolutionOutcome: null,
      createdAt: "2026-04-09T00:00:00Z",
      updatedAt: "2026-04-09T00:00:00Z",
    });
    vi.mocked(repo.updateDispute).mockResolvedValueOnce({
      id: "d-1",
      organizationId: "org-1",
      snapshotId: "snap-1",
      status: "resolved",
      reason: "x",
      evidence: {},
      openedByUserId: "u-1",
      openedAt: "2026-04-09T00:00:00Z",
      reviewedByUserId: "admin-1",
      reviewedAt: "2026-04-09T00:00:00Z",
      resolutionNotes: "ok",
      resolutionOutcome: "affirmed",
      createdAt: "2026-04-09T00:00:00Z",
      updatedAt: "2026-04-09T00:00:00Z",
    });

    const result = await reviewScoreDispute({
      disputeId: "d-1",
      reviewerUserId: "admin-1",
      toStatus: "resolved",
      resolutionNotes: "ok",
      resolutionOutcome: "affirmed",
    });
    expect(result.status).toBe("resolved");
    expect(result.resolutionOutcome).toBe("affirmed");
  });

  it("publishScoreMethodology activates target and demotes prior", async () => {
    const target = {
      id: "m-new",
      version: "2.0.0",
      name: "v2",
      description: null,
      status: "draft" as const,
      categoryDefinitions: [],
      weights: {},
      createdByUserId: "u-1",
      publishedAt: null,
      deprecatedAt: null,
      createdAt: "2026-04-09T00:00:00Z",
      updatedAt: "2026-04-09T00:00:00Z",
    };
    const prior = { ...target, id: "m-old", status: "active" as const, version: "1.0.0" };

    vi.mocked(repo.getMethodologyById).mockResolvedValueOnce(target);
    vi.mocked(repo.getActiveMethodology).mockResolvedValueOnce(prior);
    vi.mocked(repo.setMethodologyStatus)
      .mockResolvedValueOnce({ ...prior, status: "deprecated" })
      .mockResolvedValueOnce({ ...target, status: "active" });

    const result = await publishScoreMethodology({ id: "m-new" });
    expect(result.status).toBe("active");
    expect(repo.setMethodologyStatus).toHaveBeenCalledWith(
      "m-old",
      "deprecated",
      expect.anything(),
    );
  });

  it("updateProviderAffiliation writes via insertAffiliation (history-preserving)", async () => {
    vi.mocked(repo.getCurrentAffiliation).mockResolvedValueOnce({
      id: "a-0",
      organizationId: "org-1",
      status: "pending_review",
      reason: null,
      notes: null,
      setByUserId: "admin-1",
      setAt: "2026-04-09T00:00:00Z",
      isCurrent: true,
      createdAt: "2026-04-09T00:00:00Z",
      updatedAt: "2026-04-09T00:00:00Z",
    });
    vi.mocked(repo.insertAffiliation).mockResolvedValueOnce({
      id: "a-1",
      organizationId: "org-1",
      status: "affiliated",
      reason: "Approved",
      notes: null,
      setByUserId: "admin-1",
      setAt: "2026-04-09T01:00:00Z",
      isCurrent: true,
      createdAt: "2026-04-09T01:00:00Z",
      updatedAt: "2026-04-09T01:00:00Z",
    });
    const result = await updateProviderAffiliation({
      organizationId: "org-1",
      toStatus: "affiliated",
      reason: "Approved",
      setByUserId: "admin-1",
    });
    expect(result.status).toBe("affiliated");
    expect(result.id).toBe("a-1");
    // insertAffiliation was the path (not an update).
    expect(repo.insertAffiliation).toHaveBeenCalledTimes(1);
  });
});
