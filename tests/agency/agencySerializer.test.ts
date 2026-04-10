/**
 * Domain 6.2 — Agency serializer tests (3 tests)
 */

import { describe, it, expect } from "vitest";
import {
  serializeSubmissionForProvider,
  serializeSubmissionForAgency,
  serializeAgencyOverview,
} from "@/lib/server/agency/agencySerializer";
import type { ReportingSubmission } from "@/lib/server/agency/agencyTypes";

function mockSubmission(overrides: Partial<ReportingSubmission> = {}): ReportingSubmission {
  return {
    id: "sub-1",
    organizationId: "org-1",
    agencyId: "ag-1",
    submittedByUserId: "u-prov",
    reviewedByUserId: "u-ag",
    status: "accepted",
    title: "Q1 Report",
    description: "Full quarterly report",
    reportingPeriodStart: "2026-01-01",
    reportingPeriodEnd: "2026-03-31",
    submissionData: { case_count: 42, applicant_names: ["SHOULD_NOT_LEAK"] },
    revisionReason: null,
    rejectionReason: null,
    submittedAt: "2026-04-01T00:00:00Z",
    reviewedAt: "2026-04-05T00:00:00Z",
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-05T00:00:00Z",
    ...overrides,
  };
}

describe("agency serializer", () => {
  it("provider serializer exposes own-org reporting workflow only — no agency internals", () => {
    const view = serializeSubmissionForProvider(mockSubmission());
    expect(view.id).toBe("sub-1");
    expect(view.status).toBe("accepted");
    expect(view.title).toBe("Q1 Report");
    // Must NOT contain agency internal fields
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/agencyId/);
    expect(json).not.toMatch(/reviewedByUserId/);
    expect(json).not.toMatch(/submissionData/);
    expect(json).not.toMatch(/applicant_names/);
  });

  it("agency serializer is aggregate/comparative and scope-safe — no applicant detail", () => {
    const view = serializeSubmissionForAgency(mockSubmission());
    expect(view.organizationId).toBe("org-1");
    expect(view.status).toBe("accepted");
    const json = JSON.stringify(view);
    // Must NOT contain applicant-level operational detail
    expect(json).not.toMatch(/submissionData/);
    expect(json).not.toMatch(/applicant_names/);
    expect(json).not.toMatch(/submittedByUserId/);
    // But DOES contain aggregate review info
    expect(view.submittedAt).toBe("2026-04-01T00:00:00Z");
    expect(view.reviewedAt).toBe("2026-04-05T00:00:00Z");
  });

  it("no applicant-level operational detail in agency overview", () => {
    const overview = serializeAgencyOverview({
      agencyId: "ag-1",
      providerCount: 12,
      submissionStatusCounts: { accepted: 5, submitted: 3, draft: 4 },
      tierDistribution: { verified: 2, established: 5, emerging: 5 },
    });
    const json = JSON.stringify(overview);
    expect(json).not.toMatch(/applicant/i);
    expect(json).not.toMatch(/case_id/i);
    expect(json).not.toMatch(/intake/i);
    expect(overview.providerCount).toBe(12);
    expect(overview.submissionStatusCounts.accepted).toBe(5);
    expect(overview.tierDistribution.verified).toBe(2);
  });
});
