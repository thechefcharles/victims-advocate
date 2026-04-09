/**
 * Domain 5.2 — Recommendation serializer tests (3 tests).
 *
 * Asserts:
 *   - Applicant view contains human-readable reason + actionLabel
 *   - ranking_score is absent from every serializer output
 *   - Admin serializer preserves context summary and reasonCode
 */

import { describe, it, expect } from "vitest";
import {
  serializeForApplicant,
  serializeForProvider,
  serializeForAdmin,
} from "@/lib/server/recommendations/recommendationSerializer";
import type {
  RecommendationItem,
  RecommendationSet,
} from "@/lib/server/recommendations/recommendationTypes";

function mockItem(overrides: Partial<RecommendationItem> = {}): RecommendationItem {
  return {
    resourceId: "org-1",
    resourceType: "organization",
    title: "Legal Aid Chicago",
    description: "Free civil legal help",
    reason: "Matches services you said you needed: legal aid.",
    reasonCode: "intake_need_match",
    priority: "high",
    category: "legal",
    actionLabel: "Get help",
    distanceMiles: 3.2,
    reliabilityTier: "established",
    ...overrides,
  };
}

function mockSet(items: RecommendationItem[]): RecommendationSet {
  return {
    setId: "set-1",
    userId: "user-1",
    items,
    generatedAt: "2026-04-09T00:00:00Z",
    contextSummary: {
      stateCode: "IL",
      categories: ["legal"],
      workflowState: "active",
      excludedCount: 0,
    },
  };
}

describe("recommendation serializer", () => {
  it("applicant serializer exposes reason + actionLabel and omits internal fields", () => {
    const set = mockSet([mockItem()]);
    const view = serializeForApplicant(set);
    expect(view.items[0].reason).toBe("Matches services you said you needed: legal aid.");
    expect(view.items[0].actionLabel).toBe("Get help");
    expect(view.items[0].reliabilityTier).toBe("established");
    // Applicant view must NOT leak userId or contextSummary
    expect((view as Record<string, unknown>).userId).toBeUndefined();
    expect((view as Record<string, unknown>).contextSummary).toBeUndefined();
    // Internal reasonCode enum not exposed to applicant
    expect((view.items[0] as Record<string, unknown>).reasonCode).toBeUndefined();
  });

  it("ranking_score is NOT present on any serializer output", () => {
    const set = mockSet([mockItem()]);
    const applicant = serializeForApplicant(set);
    const provider = serializeForProvider(set);
    const admin = serializeForAdmin(set);

    const applicantStr = JSON.stringify(applicant);
    const providerStr = JSON.stringify(provider);
    const adminStr = JSON.stringify(admin);

    expect(applicantStr).not.toMatch(/ranking_score/);
    expect(providerStr).not.toMatch(/ranking_score/);
    expect(adminStr).not.toMatch(/ranking_score/);
  });

  it("admin serializer preserves full context summary and reasonCode", () => {
    const set = mockSet([mockItem()]);
    const view = serializeForAdmin(set);
    expect(view.contextSummary.stateCode).toBe("IL");
    expect(view.contextSummary.categories).toEqual(["legal"]);
    expect(view.items[0].reasonCode).toBe("intake_need_match");
    expect(view.userId).toBe("user-1");
  });
});
