/**
 * Domain 6.1 — Trust serializer tests (4 tests)
 *
 * Asserts the four serializers expose the right fields and STRIP everything
 * else. Tests use string-search to enforce that internal fields cannot leak
 * through accidental object spreading.
 */

import { describe, it, expect } from "vitest";
import {
  serializeForPublic,
  serializeForApplicant,
  serializeForProvider,
  serializeForAgency,
  serializeForAdmin,
} from "@/lib/server/trust/trustSerializer";
import type {
  ProviderReliabilitySummary,
  ProviderScoreInput,
  ProviderScoreSnapshot,
  ScoreMethodology,
} from "@/lib/server/trust/trustTypes";

const summary: ProviderReliabilitySummary = {
  id: "rs-1",
  organizationId: "org-1",
  snapshotId: "snap-1",
  reliabilityTier: "verified",
  highlights: ["Strong responsiveness signals (90%)."],
  availabilitySummary: "Accepting clients",
  languageSummary: "English, Spanish",
  freshness: "2026-04-09T00:00:00Z",
  isCurrent: true,
  computedAt: "2026-04-09T00:00:00Z",
  createdAt: "2026-04-09T00:00:00Z",
  updatedAt: "2026-04-09T00:00:00Z",
};

const snapshot: ProviderScoreSnapshot = {
  id: "snap-1",
  organizationId: "org-1",
  methodologyId: "m-1",
  methodologyVersion: "1.0.0",
  categoryScores: { responsiveness: 0.9, completeness: 0.5 },
  weightedComposite: 0.85,
  scoreStatus: "computed",
  calcMetadata: { input_count: 10 },
  computedAt: "2026-04-09T00:00:00Z",
  createdAt: "2026-04-09T00:00:00Z",
};

const methodology: ScoreMethodology = {
  id: "m-1",
  version: "1.0.0",
  name: "v1",
  description: null,
  status: "active",
  categoryDefinitions: [],
  weights: {},
  createdByUserId: "u-1",
  publishedAt: null,
  deprecatedAt: null,
  createdAt: "2026-04-09T00:00:00Z",
  updatedAt: "2026-04-09T00:00:00Z",
};

const inputs: ProviderScoreInput[] = [
  {
    id: "i-1",
    snapshotId: "snap-1",
    organizationId: "org-1",
    category: "responsiveness",
    signalType: "case_response_time",
    rawValue: 10,
    normalizedValue: 0.9,
    weight: 0.3,
    contribution: 0.27,
    source: "trust_signal_aggregates",
    createdAt: "2026-04-09T00:00:00Z",
  },
];

describe("trust serializer", () => {
  it("applicant serializer excludes weightedComposite, categoryScores, and inputs", () => {
    const view = serializeForApplicant(summary);
    expect(view.reliabilityTier).toBe("verified");
    expect(view.highlights[0]).toContain("responsiveness");
    expect(view.availabilitySummary).toBe("Accepting clients");

    const json = JSON.stringify(view);
    expect(json).not.toMatch(/weightedComposite/);
    expect(json).not.toMatch(/categoryScores/);
    expect(json).not.toMatch(/methodologyId/);
    expect(json).not.toMatch(/snapshotId/);
    expect(json).not.toMatch(/calc_metadata/);
  });

  it("provider serializer includes own-org category details (composite + categoryScores)", () => {
    const view = serializeForProvider(snapshot);
    expect(view.weightedComposite).toBe(0.85);
    expect(view.categoryScores.responsiveness).toBe(0.9);
    expect(view.organizationId).toBe("org-1");
    expect(view.methodologyVersion).toBe("1.0.0");
    // Calc metadata is internal — not in provider view.
    expect((view as unknown as Record<string, unknown>).calcMetadata).toBeUndefined();
  });

  it("agency serializer excludes per-input detail and applicant-level operational data", () => {
    const view = serializeForAgency({ snapshot, summary });
    expect(view.weightedComposite).toBe(0.85);
    expect(view.reliabilityTier).toBe("verified");
    expect(view.methodologyVersion).toBe("1.0.0");

    const json = JSON.stringify(view);
    expect(json).not.toMatch(/categoryScores/);
    expect(json).not.toMatch(/highlights/);
    expect(json).not.toMatch(/availabilitySummary/);
  });

  it("admin serializer includes full governance metadata (snapshot + inputs + methodology)", () => {
    const view = serializeForAdmin({ snapshot, inputs, summary, methodology });
    expect(view.snapshot.weightedComposite).toBe(0.85);
    expect(view.inputs[0].source).toBe("trust_signal_aggregates");
    expect(view.methodology.version).toBe("1.0.0");
    expect(view.summary?.reliabilityTier).toBe("verified");
    // Public serializer is the minimal one — confirm it exists too.
    const publicView = serializeForPublic(summary);
    expect(publicView.reliabilityTier).toBe("verified");
    expect(Object.keys(publicView).sort()).toEqual([
      "freshness",
      "organizationId",
      "reliabilityTier",
    ]);
  });
});
