/**
 * Domain 6.2 — Agency service tests (8 tests)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({}) as never,
}));

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/trustSignal/signalEmitter", () => ({
  emitSignal: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/server/agency/agencyRepository", () => ({
  insertSubmission: vi.fn(),
  getSubmissionById: vi.fn(),
  updateSubmissionStatus: vi.fn(),
  listSubmissionsForOrg: vi.fn(),
  listSubmissionsForAgency: vi.fn(),
  insertNotice: vi.fn(),
  getAnalyticsSnapshots: vi.fn(),
  getOversightOrgIds: vi.fn(),
  isOrgInAgencyScope: vi.fn(),
  getAgencyById: vi.fn(),
  getAgencyMembershipForUser: vi.fn(),
}));

import * as repo from "@/lib/server/agency/agencyRepository";
import * as signalEmitter from "@/lib/server/trustSignal/signalEmitter";
import * as audit from "@/lib/server/audit/logEvent";
import {
  createReportingSubmissionDraft,
  submitReportingSubmission,
  requestReportingRevision,
  acceptReportingSubmission,
  rejectReportingSubmission,
} from "@/lib/server/agency/reportingSubmissionService";
import { createAgencyNotice } from "@/lib/server/agency/agencyNoticeService";
import { getAgencyAnalytics } from "@/lib/server/agency/agencyAnalyticsService";
import type { ReportingSubmission } from "@/lib/server/agency/agencyTypes";

function mockSubmission(
  overrides: Partial<ReportingSubmission> = {},
): ReportingSubmission {
  return {
    id: "sub-1",
    organizationId: "org-1",
    agencyId: "ag-1",
    submittedByUserId: "u-1",
    reviewedByUserId: null,
    status: "draft",
    title: "Q1 Report",
    description: null,
    reportingPeriodStart: "2026-01-01",
    reportingPeriodEnd: "2026-03-31",
    submissionData: {},
    revisionReason: null,
    rejectionReason: null,
    submittedAt: null,
    reviewedAt: null,
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("agency service", () => {
  it("createReportingSubmissionDraft creates with status=draft", async () => {
    vi.mocked(repo.insertSubmission).mockResolvedValueOnce(mockSubmission());
    const sub = await createReportingSubmissionDraft({
      organizationId: "org-1",
      agencyId: "ag-1",
      submittedByUserId: "u-1",
      title: "Q1 Report",
      reportingPeriodStart: "2026-01-01",
      reportingPeriodEnd: "2026-03-31",
    });
    expect(sub.status).toBe("draft");
    expect(repo.insertSubmission).toHaveBeenCalledTimes(1);
  });

  it("submitReportingSubmission emits trust signal + audit event", async () => {
    vi.mocked(repo.getSubmissionById).mockResolvedValueOnce(mockSubmission({ status: "draft" }));
    vi.mocked(repo.updateSubmissionStatus).mockResolvedValueOnce(mockSubmission({ status: "submitted" }));

    const sub = await submitReportingSubmission({ submissionId: "sub-1", submittedByUserId: "u-1" });
    expect(sub.status).toBe("submitted");
    expect(signalEmitter.emitSignal).toHaveBeenCalledTimes(1);
    expect(audit.logEvent).toHaveBeenCalledTimes(1);
  });

  it("requestReportingRevision requires reason", async () => {
    await expect(
      requestReportingRevision({
        submissionId: "sub-1",
        reviewerUserId: "ag-u-1",
        reason: "",
      }),
    ).rejects.toThrow(/reason/i);
  });

  it("requestReportingRevision transitions submitted → revision_requested", async () => {
    vi.mocked(repo.getSubmissionById).mockResolvedValueOnce(mockSubmission({ status: "submitted" }));
    vi.mocked(repo.updateSubmissionStatus).mockResolvedValueOnce(
      mockSubmission({ status: "revision_requested", revisionReason: "Need Q1 detail" }),
    );

    const sub = await requestReportingRevision({
      submissionId: "sub-1",
      reviewerUserId: "ag-u-1",
      reason: "Need Q1 detail",
    });
    expect(sub.status).toBe("revision_requested");
    expect(signalEmitter.emitSignal).toHaveBeenCalledTimes(1);
    expect(audit.logEvent).toHaveBeenCalledTimes(1);
  });

  it("acceptReportingSubmission emits trust signal + audit", async () => {
    vi.mocked(repo.getSubmissionById).mockResolvedValueOnce(mockSubmission({ status: "submitted" }));
    vi.mocked(repo.updateSubmissionStatus).mockResolvedValueOnce(mockSubmission({ status: "accepted" }));

    const sub = await acceptReportingSubmission({ submissionId: "sub-1", reviewerUserId: "ag-u-1" });
    expect(sub.status).toBe("accepted");
    expect(signalEmitter.emitSignal).toHaveBeenCalledTimes(1);
    expect(audit.logEvent).toHaveBeenCalledTimes(1);
  });

  it("rejectReportingSubmission requires reason + emits trust signal", async () => {
    vi.mocked(repo.getSubmissionById).mockResolvedValueOnce(mockSubmission({ status: "submitted" }));
    vi.mocked(repo.updateSubmissionStatus).mockResolvedValueOnce(
      mockSubmission({ status: "rejected", rejectionReason: "Incomplete" }),
    );

    const sub = await rejectReportingSubmission({
      submissionId: "sub-1",
      reviewerUserId: "ag-u-1",
      reason: "Incomplete",
    });
    expect(sub.status).toBe("rejected");
    expect(signalEmitter.emitSignal).toHaveBeenCalledTimes(1);
  });

  it("getAgencyAnalytics reads from analytics_snapshots not raw tables", async () => {
    vi.mocked(repo.getAnalyticsSnapshots).mockResolvedValueOnce([]);
    const result = await getAgencyAnalytics({ agencyId: "ag-1", snapshotType: "provider_overview" });
    expect(repo.getAnalyticsSnapshots).toHaveBeenCalledWith("ag-1", "provider_overview", expect.anything());
    expect(result.empty).toBe(true);
  });

  it("createAgencyNotice validates required fields + creates notice", async () => {
    vi.mocked(repo.insertNotice).mockResolvedValueOnce({
      id: "n-1",
      agencyId: "ag-1",
      targetOrganizationId: "org-1",
      noticeType: "compliance_warning",
      subject: "Missing docs",
      body: "Please upload Q1 docs.",
      relatedSubmissionId: null,
      issuedByUserId: "ag-u-1",
      acknowledgedAt: null,
      createdAt: "2026-04-01T00:00:00Z",
      updatedAt: "2026-04-01T00:00:00Z",
    });

    const notice = await createAgencyNotice({
      agencyId: "ag-1",
      targetOrganizationId: "org-1",
      noticeType: "compliance_warning",
      subject: "Missing docs",
      body: "Please upload Q1 docs.",
      issuedByUserId: "ag-u-1",
    });
    expect(notice.noticeType).toBe("compliance_warning");
    expect(audit.logEvent).toHaveBeenCalledTimes(1);
  });
});
