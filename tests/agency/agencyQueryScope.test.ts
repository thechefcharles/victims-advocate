/**
 * Domain 6.2 — Agency query scope tests (4 tests)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({}) as never,
}));

vi.mock("@/lib/server/agency/agencyRepository", () => ({
  getAgencyMembershipForUser: vi.fn(),
  getOversightOrgIds: vi.fn(),
  getAnalyticsSnapshots: vi.fn(),
}));

import * as repo from "@/lib/server/agency/agencyRepository";
import { resolveAgencyScope, isOrgInScope } from "@/lib/server/agency/agencyScopeService";
import {
  serializeSubmissionForProvider,
  serializeSubmissionForAgency,
} from "@/lib/server/agency/agencySerializer";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";
import type { ReportingSubmission } from "@/lib/server/agency/agencyTypes";

function mockActor(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    userId: "u-1",
    accountType: "agency",
    activeRole: "program_officer",
    tenantId: "ag-1",
    tenantType: "agency",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
    ...overrides,
  };
}

function mockSubmission(overrides: Partial<ReportingSubmission> = {}): ReportingSubmission {
  return {
    id: "sub-1",
    organizationId: "org-1",
    agencyId: "ag-1",
    submittedByUserId: "u-prov",
    reviewedByUserId: null,
    status: "submitted",
    title: "Q1 Report",
    description: null,
    reportingPeriodStart: "2026-01-01",
    reportingPeriodEnd: "2026-03-31",
    submissionData: { case_count: 42 },
    revisionReason: null,
    rejectionReason: null,
    submittedAt: "2026-04-01T00:00:00Z",
    reviewedAt: null,
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => { vi.clearAllMocks(); });

describe("agency query scope", () => {
  it("provider sees own org submissions only — serializer strips agency internals", () => {
    const sub = mockSubmission({ organizationId: "org-a" });
    const view = serializeSubmissionForProvider(sub);
    // Provider view does NOT include agency_id or reviewed_by
    expect((view as unknown as Record<string, unknown>).agencyId).toBeUndefined();
    expect((view as unknown as Record<string, unknown>).reviewedByUserId).toBeUndefined();
    expect(view.id).toBe("sub-1");
    expect(view.status).toBe("submitted");
  });

  it("agency sees in-scope submissions — scope resolves from membership", async () => {
    vi.mocked(repo.getAgencyMembershipForUser).mockResolvedValueOnce({
      id: "m-1",
      agencyId: "ag-1",
      userId: "u-1",
      role: "program_officer",
      status: "active",
      joinedAt: "2026-01-01T00:00:00Z",
      removedAt: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    vi.mocked(repo.getOversightOrgIds).mockResolvedValueOnce(["org-1", "org-2"]);

    const scope = await resolveAgencyScope(mockActor());
    expect(scope).not.toBeNull();
    expect(scope?.agencyId).toBe("ag-1");
    expect(scope?.inScopeOrgIds).toContain("org-1");
  });

  it("agency analytics don't expose applicant workflow detail — serializer checks", () => {
    const agencyView = serializeSubmissionForAgency(mockSubmission());
    const json = JSON.stringify(agencyView);
    // Must NOT contain applicant PII or submission data internals
    expect(json).not.toMatch(/submittedByUserId/);
    expect(json).not.toMatch(/submissionData/);
    expect(json).not.toMatch(/rejectionReason/);
    // But DOES contain aggregate review fields
    expect(agencyView.status).toBe("submitted");
    expect(agencyView.organizationId).toBe("org-1");
  });

  it("cross-agency scope denied — isOrgInScope returns false for out-of-scope org", async () => {
    vi.mocked(repo.getAgencyMembershipForUser).mockResolvedValueOnce({
      id: "m-1",
      agencyId: "ag-1",
      userId: "u-1",
      role: "program_officer",
      status: "active",
      joinedAt: "2026-01-01T00:00:00Z",
      removedAt: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    vi.mocked(repo.getOversightOrgIds).mockResolvedValueOnce(["org-1"]);

    const inScope = await isOrgInScope(mockActor(), "org-NOT-in-scope");
    expect(inScope).toBe(false);
  });
});
