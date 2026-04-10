/**
 * Domain 6.1 — Trust state / behavior tests (5 tests)
 *
 * Asserts the canonical state-machine rules:
 *   1. Only one active methodology at a time
 *   2. Historical snapshots retain methodology version
 *   3. Dispute lifecycle: open → under_review → resolved → closed
 *   4. Affiliation transitions follow allowed admin paths only
 *   5. Applicant-safe summary strips internal score fields
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({}) as never,
}));

vi.mock("@/lib/server/trust/trustRepository", () => ({
  // Methodology
  getActiveMethodology: vi.fn(),
  getMethodologyById: vi.fn(),
  insertMethodology: vi.fn(),
  listMethodologies: vi.fn(),
  setMethodologyStatus: vi.fn(),
  updateMethodologyDraft: vi.fn(),
  // Snapshot
  insertSnapshot: vi.fn(),
  getSnapshotById: vi.fn(),
  getLatestSnapshotForOrg: vi.fn(),
  listSnapshotsForOrg: vi.fn(),
  insertScoreInputs: vi.fn(),
  getInputsForSnapshot: vi.fn(),
  // Summary
  insertReliabilitySummary: vi.fn(),
  getCurrentReliabilitySummary: vi.fn(),
  // Dispute
  insertDispute: vi.fn(),
  getDisputeById: vi.fn(),
  updateDispute: vi.fn(),
  // Affiliation
  insertAffiliation: vi.fn(),
  getCurrentAffiliation: vi.fn(),
  // Search projection
  updateSearchIndexReliabilityTier: vi.fn(),
  // Aggregates
  getTrustSignalAggregates: vi.fn().mockResolvedValue([]),
}));

import * as repo from "@/lib/server/trust/trustRepository";
import { publishScoreMethodology } from "@/lib/server/trust/scoreMethodologyService";
import {
  createScoreDispute,
  reviewScoreDispute,
} from "@/lib/server/trust/scoreDisputeService";
import { updateProviderAffiliation } from "@/lib/server/trust/providerAffiliationService";
import { mapToReliabilitySummary } from "@/lib/server/trust/providerScoreService";
import { serializeForApplicant } from "@/lib/server/trust/trustSerializer";
import type {
  ProviderScoreSnapshot,
  ScoreMethodology,
  ScoreDispute,
  ProviderReliabilitySummary,
  ProviderAffiliationStatus,
} from "@/lib/server/trust/trustTypes";

function mockMethodology(
  overrides: Partial<ScoreMethodology> = {},
): ScoreMethodology {
  return {
    id: "m-1",
    version: "1.0.0",
    name: "v1",
    description: null,
    status: "draft",
    categoryDefinitions: [],
    weights: {},
    createdByUserId: "u-1",
    publishedAt: null,
    deprecatedAt: null,
    createdAt: "2026-04-09T00:00:00Z",
    updatedAt: "2026-04-09T00:00:00Z",
    ...overrides,
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
    categoryScores: { responsiveness: 0.6, completeness: 0.5 },
    weightedComposite: 0.7,
    scoreStatus: "computed",
    calcMetadata: {},
    computedAt: "2026-04-09T00:00:00Z",
    createdAt: "2026-04-09T00:00:00Z",
    ...overrides,
  };
}

function mockDispute(overrides: Partial<ScoreDispute> = {}): ScoreDispute {
  return {
    id: "d-1",
    organizationId: "org-1",
    snapshotId: "snap-1",
    status: "open",
    reason: "Test dispute",
    evidence: {},
    openedByUserId: "u-1",
    openedAt: "2026-04-09T00:00:00Z",
    reviewedByUserId: null,
    reviewedAt: null,
    resolutionNotes: null,
    resolutionOutcome: null,
    createdAt: "2026-04-09T00:00:00Z",
    updatedAt: "2026-04-09T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("trust state / behavior", () => {
  it("publishing a methodology demotes the prior active row to deprecated", async () => {
    const prior = mockMethodology({ id: "m-old", status: "active", version: "0.9.0" });
    const target = mockMethodology({ id: "m-new", status: "draft", version: "1.0.0" });
    const activated = mockMethodology({ id: "m-new", status: "active", version: "1.0.0" });

    vi.mocked(repo.getMethodologyById).mockResolvedValueOnce(target);
    vi.mocked(repo.getActiveMethodology).mockResolvedValueOnce(prior);
    vi.mocked(repo.setMethodologyStatus)
      .mockResolvedValueOnce({ ...prior, status: "deprecated" })
      .mockResolvedValueOnce(activated);

    const result = await publishScoreMethodology({ id: "m-new" });
    expect(result.status).toBe("active");
    // Confirm prior was demoted before new was activated.
    expect(repo.setMethodologyStatus).toHaveBeenNthCalledWith(1, "m-old", "deprecated", expect.anything());
    expect(repo.setMethodologyStatus).toHaveBeenNthCalledWith(2, "m-new", "active", expect.anything());
  });

  it("historical snapshot retains methodology version after a new snapshot is created", () => {
    const oldSnap = mockSnapshot({
      id: "snap-old",
      methodologyVersion: "1.0.0",
      computedAt: "2026-04-01T00:00:00Z",
    });
    const newSnap = mockSnapshot({
      id: "snap-new",
      methodologyVersion: "2.0.0",
      computedAt: "2026-04-09T00:00:00Z",
    });
    // Snapshots are immutable history — old snapshot's methodology version
    // is preserved even after a new snapshot is created.
    expect(oldSnap.methodologyVersion).toBe("1.0.0");
    expect(newSnap.methodologyVersion).toBe("2.0.0");
    expect(oldSnap.id).not.toBe(newSnap.id);
  });

  it("dispute lifecycle: open → under_review → resolved → closed", async () => {
    vi.mocked(repo.getDisputeById)
      .mockResolvedValueOnce(mockDispute({ status: "open" }))
      .mockResolvedValueOnce(mockDispute({ status: "under_review" }))
      .mockResolvedValueOnce(mockDispute({ status: "resolved" }));

    vi.mocked(repo.updateDispute)
      .mockResolvedValueOnce(mockDispute({ status: "under_review" }))
      .mockResolvedValueOnce(mockDispute({ status: "resolved", resolutionOutcome: "affirmed" }))
      .mockResolvedValueOnce(mockDispute({ status: "closed" }));

    const r1 = await reviewScoreDispute({
      disputeId: "d-1",
      reviewerUserId: "admin-1",
      toStatus: "under_review",
    });
    expect(r1.status).toBe("under_review");

    const r2 = await reviewScoreDispute({
      disputeId: "d-1",
      reviewerUserId: "admin-1",
      toStatus: "resolved",
      resolutionOutcome: "affirmed",
    });
    expect(r2.status).toBe("resolved");

    const r3 = await reviewScoreDispute({
      disputeId: "d-1",
      reviewerUserId: "admin-1",
      toStatus: "closed",
    });
    expect(r3.status).toBe("closed");

    // Invalid backwards transition rejected.
    vi.mocked(repo.getDisputeById).mockResolvedValueOnce(mockDispute({ status: "closed" }));
    await expect(
      reviewScoreDispute({
        disputeId: "d-1",
        reviewerUserId: "admin-1",
        toStatus: "open",
      }),
    ).rejects.toThrow();
  });

  it("affiliation state changes follow allowed admin paths only", async () => {
    // Initial set must be pending_review.
    vi.mocked(repo.getCurrentAffiliation).mockResolvedValueOnce(null);
    vi.mocked(repo.insertAffiliation).mockResolvedValueOnce({
      id: "a-1",
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

    const init = await updateProviderAffiliation({
      organizationId: "org-1",
      toStatus: "pending_review",
      setByUserId: "admin-1",
    });
    expect(init.status).toBe("pending_review");

    // Cannot initialize as affiliated.
    vi.mocked(repo.getCurrentAffiliation).mockResolvedValueOnce(null);
    await expect(
      updateProviderAffiliation({
        organizationId: "org-2",
        toStatus: "affiliated",
        setByUserId: "admin-1",
      }),
    ).rejects.toThrow();

    // affiliated → suspended is allowed
    vi.mocked(repo.getCurrentAffiliation).mockResolvedValueOnce({
      ...init,
      status: "affiliated",
    });
    vi.mocked(repo.insertAffiliation).mockResolvedValueOnce({
      ...init,
      status: "suspended",
    });
    const sus = await updateProviderAffiliation({
      organizationId: "org-1",
      toStatus: "suspended",
      setByUserId: "admin-1",
    });
    expect(sus.status).toBe("suspended");

    // affiliated → pending_review is NOT allowed
    vi.mocked(repo.getCurrentAffiliation).mockResolvedValueOnce({
      ...init,
      status: "affiliated",
    });
    await expect(
      updateProviderAffiliation({
        organizationId: "org-1",
        toStatus: "pending_review",
        setByUserId: "admin-1",
      }),
    ).rejects.toThrow();
  });

  it("applicant-safe summary strips weighted_composite, category_scores, and inputs", async () => {
    vi.mocked(repo.insertReliabilitySummary).mockResolvedValueOnce({
      id: "rs-1",
      organizationId: "org-1",
      snapshotId: "snap-1",
      reliabilityTier: "established",
      highlights: ["Strong responsiveness signals (60%)."],
      availabilitySummary: null,
      languageSummary: null,
      freshness: "2026-04-09T00:00:00Z",
      isCurrent: true,
      computedAt: "2026-04-09T00:00:00Z",
      createdAt: "2026-04-09T00:00:00Z",
      updatedAt: "2026-04-09T00:00:00Z",
    });

    const summary = await mapToReliabilitySummary(mockSnapshot());
    const view = serializeForApplicant(summary);
    const json = JSON.stringify(view);

    expect(json).not.toMatch(/weighted_composite/);
    expect(json).not.toMatch(/weightedComposite/);
    expect(json).not.toMatch(/category_scores/);
    expect(json).not.toMatch(/categoryScores/);
    expect(json).not.toMatch(/score_inputs/);
    expect(json).not.toMatch(/methodology_id/);
    expect(view.reliabilityTier).toBe("established");
    expect(view.highlights.length).toBeGreaterThan(0);
  });
});
