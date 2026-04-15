/**
 * Gap closure — Audit hook tests (3 tests)
 *
 * Verifies logAuditEvent is called from policy document publish,
 * change request approve, and submission rejection.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: () => ({}) as never }));
vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/server/trustSignal/signalEmitter", () => ({
  emitSignal: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/server/governance/governanceRepository", () => ({
  insertAuditEvent: vi.fn().mockResolvedValue({ id: "ae-1", actorId: "u", action: "test", resourceType: "t", resourceId: "r", eventCategory: "admin_action", metadata: {}, createdAt: "2026-04-10", tenantId: null }),
  listAuditEvents: vi.fn(),
  getPolicyDocumentById: vi.fn(),
  getActivePolicyDocument: vi.fn(),
  setPolicyDocumentStatus: vi.fn(),
  listPolicyDocuments: vi.fn(),
  getChangeRequestById: vi.fn(),
  updateChangeRequestStatus: vi.fn(),
  insertApprovalDecision: vi.fn().mockResolvedValue({ id: "ad-1" }),
  insertPolicyAcceptance: vi.fn(),
  getPolicyAcceptance: vi.fn(),
}));

vi.mock("@/lib/server/agency/agencyRepository", () => ({
  getSubmissionById: vi.fn(),
  updateSubmissionStatus: vi.fn(),
}));

import * as govRepo from "@/lib/server/governance/governanceRepository";
import * as agencyRepo from "@/lib/server/agency/agencyRepository";
import { publishPolicyDocument } from "@/lib/server/governance/policyDocumentService";
import { approveChangeRequest } from "@/lib/server/governance/changeRequestService";
import { rejectReportingSubmission } from "@/lib/server/agency/reportingSubmissionService";

beforeEach(() => { vi.clearAllMocks(); });

describe("audit hook gap closure", () => {
  it("policy document publish → logAuditEvent with governance_change", async () => {
    vi.mocked(govRepo.getPolicyDocumentById).mockResolvedValueOnce({
      id: "pd-1", policyType: "tos", version: "1.0", title: "T", content: "C",
      status: "draft", createdByUserId: "u", publishedAt: null, deprecatedAt: null,
      createdAt: "2026-04-10", updatedAt: "2026-04-10",
    } as never);
    vi.mocked(govRepo.getActivePolicyDocument).mockResolvedValueOnce(null);
    vi.mocked(govRepo.setPolicyDocumentStatus).mockResolvedValueOnce({
      id: "pd-1", policyType: "tos", version: "1.0", title: "T", content: "C",
      status: "active", createdByUserId: "u", publishedAt: "2026-04-10", deprecatedAt: null,
      createdAt: "2026-04-10", updatedAt: "2026-04-10",
    } as never);

    await publishPolicyDocument({ id: "pd-1", actorId: "admin-1" });
    expect(govRepo.insertAuditEvent).toHaveBeenCalled();
    const call = vi.mocked(govRepo.insertAuditEvent).mock.calls[0][0];
    expect(call.action).toBe("policy_document:publish");
    expect(call.eventCategory).toBe("governance_change");
  });

  it("change request approve → logAuditEvent with governance_change", async () => {
    vi.mocked(govRepo.getChangeRequestById).mockResolvedValueOnce({
      id: "cr-1", targetType: "ScoreMethodology", targetId: "sm-1",
      requestedChange: {}, reason: "test", status: "under_review",
      requestedByUserId: "u", submittedAt: "2026-04-10", resolvedAt: null,
      createdAt: "2026-04-10", updatedAt: "2026-04-10",
    } as never);
    vi.mocked(govRepo.updateChangeRequestStatus).mockResolvedValueOnce({
      id: "cr-1", targetType: "ScoreMethodology", targetId: "sm-1",
      requestedChange: {}, reason: "test", status: "approved",
      requestedByUserId: "u", submittedAt: "2026-04-10", resolvedAt: "2026-04-10",
      createdAt: "2026-04-10", updatedAt: "2026-04-10",
    } as never);

    await approveChangeRequest({ id: "cr-1", decidedByUserId: "admin-1" });
    expect(govRepo.insertAuditEvent).toHaveBeenCalled();
    const calls = vi.mocked(govRepo.insertAuditEvent).mock.calls;
    const approveCall = calls.find((c) => c[0].action === "change_request:approve");
    expect(approveCall).toBeTruthy();
    expect(approveCall![0].eventCategory).toBe("governance_change");
  });

  it("submission rejection → logAuditEvent with compliance_event", async () => {
    vi.mocked(agencyRepo.getSubmissionById).mockResolvedValueOnce({
      id: "sub-1", organizationId: "org-1", agencyId: "ag-1",
      submittedByUserId: "u", reviewedByUserId: null,
      status: "submitted", title: "Q1", description: null,
      reportingPeriodStart: "2026-01-01", reportingPeriodEnd: "2026-03-31",
      submissionData: {}, revisionReason: null, rejectionReason: null,
      submittedAt: "2026-04-01", reviewedAt: null,
      createdAt: "2026-04-01", updatedAt: "2026-04-01",
    });
    vi.mocked(agencyRepo.updateSubmissionStatus).mockResolvedValueOnce({
      id: "sub-1", organizationId: "org-1", agencyId: "ag-1",
      submittedByUserId: "u", reviewedByUserId: "ag-u-1",
      status: "rejected", title: "Q1", description: null,
      reportingPeriodStart: "2026-01-01", reportingPeriodEnd: "2026-03-31",
      submissionData: {}, revisionReason: null, rejectionReason: "Incomplete",
      submittedAt: "2026-04-01", reviewedAt: "2026-04-10",
      createdAt: "2026-04-01", updatedAt: "2026-04-10",
    });

    await rejectReportingSubmission({
      submissionId: "sub-1", reviewerUserId: "ag-u-1", reason: "Incomplete",
    });

    expect(govRepo.insertAuditEvent).toHaveBeenCalled();
    const calls = vi.mocked(govRepo.insertAuditEvent).mock.calls;
    const rejectCall = calls.find((c) => c[0].action === "reporting_submission:reject");
    expect(rejectCall).toBeTruthy();
    expect(rejectCall![0].eventCategory).toBe("compliance_event");
  });
});
