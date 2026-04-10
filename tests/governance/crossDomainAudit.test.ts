/**
 * Domain 7.1 — Cross-domain audit hook tests (3 tests)
 *
 * Asserts that logAuditEvent is called from trust and agency domains
 * after critical mutations.
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

// Mock the governance repository — logAuditEvent calls insertAuditEvent
vi.mock("@/lib/server/governance/governanceRepository", () => ({
  insertAuditEvent: vi.fn().mockResolvedValue({ id: "ae-1", actorId: "u", action: "test", resourceType: "test", resourceId: "r", eventCategory: "admin_action", metadata: {}, createdAt: "2026-04-10T00:00:00Z", tenantId: null }),
  listAuditEvents: vi.fn(),
  // Trust repo stubs needed for methodology publish
  getActiveMethodology: vi.fn(),
  getMethodologyById: vi.fn(),
  setMethodologyStatus: vi.fn(),
  // Affiliation repo stubs
  getCurrentAffiliation: vi.fn(),
  insertAffiliation: vi.fn(),
  // Agency repo stubs
  getSubmissionById: vi.fn(),
  updateSubmissionStatus: vi.fn(),
}));

// Trust repository mock
vi.mock("@/lib/server/trust/trustRepository", () => ({
  getActiveMethodology: vi.fn(),
  getMethodologyById: vi.fn(),
  setMethodologyStatus: vi.fn(),
  insertMethodology: vi.fn(),
  listMethodologies: vi.fn(),
  updateMethodologyDraft: vi.fn(),
  getCurrentAffiliation: vi.fn(),
  insertAffiliation: vi.fn(),
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
  updateSearchIndexReliabilityTier: vi.fn(),
  getTrustSignalAggregates: vi.fn(),
}));

// Agency repository mock
vi.mock("@/lib/server/agency/agencyRepository", () => ({
  getSubmissionById: vi.fn(),
  updateSubmissionStatus: vi.fn(),
  insertSubmission: vi.fn(),
  listSubmissionsForOrg: vi.fn(),
  listSubmissionsForAgency: vi.fn(),
  insertNotice: vi.fn(),
  getAnalyticsSnapshots: vi.fn(),
  getOversightOrgIds: vi.fn(),
  isOrgInAgencyScope: vi.fn(),
  getAgencyById: vi.fn(),
  getAgencyMembershipForUser: vi.fn(),
}));

import * as govRepo from "@/lib/server/governance/governanceRepository";
import * as trustRepo from "@/lib/server/trust/trustRepository";
import * as agencyRepo from "@/lib/server/agency/agencyRepository";
import { publishScoreMethodology } from "@/lib/server/trust/scoreMethodologyService";
import { updateProviderAffiliation } from "@/lib/server/trust/providerAffiliationService";
import { acceptReportingSubmission } from "@/lib/server/agency/reportingSubmissionService";

beforeEach(() => { vi.clearAllMocks(); });

describe("cross-domain audit hooks", () => {
  it("trust: score methodology publish → governance audit event logged (trust_scoring)", async () => {
    const target = {
      id: "m-1", version: "1.0.0", name: "v1", description: null,
      status: "draft" as const, categoryDefinitions: [], weights: {},
      createdByUserId: "u-1", publishedAt: null, deprecatedAt: null,
      createdAt: "2026-04-10T00:00:00Z", updatedAt: "2026-04-10T00:00:00Z",
    };
    vi.mocked(trustRepo.getMethodologyById).mockResolvedValueOnce(target);
    vi.mocked(trustRepo.getActiveMethodology).mockResolvedValueOnce(null);
    vi.mocked(trustRepo.setMethodologyStatus).mockResolvedValueOnce({ ...target, status: "active" });

    await publishScoreMethodology({ id: "m-1" });

    // logAuditEvent writes to governance audit_events via insertAuditEvent
    expect(govRepo.insertAuditEvent).toHaveBeenCalled();
    const call = vi.mocked(govRepo.insertAuditEvent).mock.calls[0][0];
    expect(call.action).toBe("score_methodology:publish");
    expect(call.eventCategory).toBe("trust_scoring");
  });

  it("trust: affiliation change → governance audit event logged (admin_action)", async () => {
    vi.mocked(trustRepo.getCurrentAffiliation).mockResolvedValueOnce(null);
    vi.mocked(trustRepo.insertAffiliation).mockResolvedValueOnce({
      id: "a-1", organizationId: "org-1", status: "pending_review",
      reason: null, notes: null, setByUserId: "admin-1", setAt: "2026-04-10T00:00:00Z",
      isCurrent: true, createdAt: "2026-04-10T00:00:00Z", updatedAt: "2026-04-10T00:00:00Z",
    });

    await updateProviderAffiliation({
      organizationId: "org-1",
      toStatus: "pending_review",
      setByUserId: "admin-1",
    });

    expect(govRepo.insertAuditEvent).toHaveBeenCalled();
    const call = vi.mocked(govRepo.insertAuditEvent).mock.calls[0][0];
    expect(call.action).toBe("provider_affiliation:manage");
    expect(call.eventCategory).toBe("admin_action");
  });

  it("agency: submission accept → governance audit event logged (compliance_event)", async () => {
    vi.mocked(agencyRepo.getSubmissionById).mockResolvedValueOnce({
      id: "sub-1", organizationId: "org-1", agencyId: "ag-1",
      submittedByUserId: "u-prov", reviewedByUserId: null,
      status: "submitted", title: "Q1", description: null,
      reportingPeriodStart: "2026-01-01", reportingPeriodEnd: "2026-03-31",
      submissionData: {}, revisionReason: null, rejectionReason: null,
      submittedAt: "2026-04-01T00:00:00Z", reviewedAt: null,
      createdAt: "2026-04-01T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z",
    });
    vi.mocked(agencyRepo.updateSubmissionStatus).mockResolvedValueOnce({
      id: "sub-1", organizationId: "org-1", agencyId: "ag-1",
      submittedByUserId: "u-prov", reviewedByUserId: "ag-u-1",
      status: "accepted", title: "Q1", description: null,
      reportingPeriodStart: "2026-01-01", reportingPeriodEnd: "2026-03-31",
      submissionData: {}, revisionReason: null, rejectionReason: null,
      submittedAt: "2026-04-01T00:00:00Z", reviewedAt: "2026-04-05T00:00:00Z",
      createdAt: "2026-04-01T00:00:00Z", updatedAt: "2026-04-05T00:00:00Z",
    });

    await acceptReportingSubmission({ submissionId: "sub-1", reviewerUserId: "ag-u-1" });

    expect(govRepo.insertAuditEvent).toHaveBeenCalled();
    const calls = vi.mocked(govRepo.insertAuditEvent).mock.calls;
    const complianceCall = calls.find((c) => c[0].eventCategory === "compliance_event");
    expect(complianceCall).toBeTruthy();
    expect(complianceCall![0].action).toBe("reporting_submission:accept");
  });
});
