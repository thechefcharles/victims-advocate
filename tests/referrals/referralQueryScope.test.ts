/**
 * Domain 4.1 — Referral query scope tests (4 tests)
 *
 * Verifies that listReferrals routes to the correct repository function
 * and that the applicant view is scoped to their own user ID.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReferralRow } from "@/lib/server/referrals/referralTypes";

const orgAReferral: ReferralRow = {
  id: "ref-1",
  created_at: "2026-04-09T00:00:00Z",
  updated_at: "2026-04-09T00:00:00Z",
  source_organization_id: "org-a",
  target_organization_id: "org-b",
  applicant_id: "applicant-1",
  initiated_by: "user-1",
  case_id: null,
  support_request_id: null,
  status: "pending_acceptance",
  reason: null,
  consent_grant_id: null,
  responded_at: null,
  responded_by: null,
};

vi.mock("@/lib/server/referrals/referralRepository", () => ({
  insertReferral: vi.fn(),
  getReferralById: vi.fn(),
  listReferralsForSourceOrg: vi.fn(),
  listReferralsForTargetOrg: vi.fn(),
  listReferralsForApplicantSafeView: vi.fn(),
  updateReferralStatus: vi.fn(),
  recordReferralEvent: vi.fn(),
}));

vi.mock("@/lib/server/referrals/referralStateMachine", () => ({
  validateReferralTransition: vi.fn(),
  validateReferralConsent: vi.fn(),
}));

import { listReferrals, listReferralsForApplicant } from "@/lib/server/referrals/referralService";
import * as repo from "@/lib/server/referrals/referralRepository";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.listReferralsForSourceOrg).mockResolvedValue([orgAReferral]);
  vi.mocked(repo.listReferralsForTargetOrg).mockResolvedValue([orgAReferral]);
  vi.mocked(repo.listReferralsForApplicantSafeView).mockResolvedValue([orgAReferral]);
});

const providerCtx = { userId: "user-1", accountType: "provider" as const, orgId: "org-a" } as Parameters<typeof listReferrals>[0]["ctx"];
const applicantCtx = { userId: "applicant-1", accountType: "applicant" as const, orgId: null } as Parameters<typeof listReferralsForApplicant>[0]["ctx"];

describe("referral query scope", () => {
  it("source org sees outgoing referrals via source_organization_id query", async () => {
    await listReferrals({ ctx: providerCtx, orgId: "org-a", direction: "outgoing" });
    expect(repo.listReferralsForSourceOrg).toHaveBeenCalledWith("org-a");
    expect(repo.listReferralsForTargetOrg).not.toHaveBeenCalled();
  });

  it("target org sees incoming referrals via target_organization_id query", async () => {
    await listReferrals({ ctx: providerCtx, orgId: "org-b", direction: "incoming" });
    expect(repo.listReferralsForTargetOrg).toHaveBeenCalledWith("org-b");
    expect(repo.listReferralsForSourceOrg).not.toHaveBeenCalled();
  });

  it("applicant view is scoped to their own applicant_id", async () => {
    await listReferralsForApplicant({ ctx: applicantCtx });
    expect(repo.listReferralsForApplicantSafeView).toHaveBeenCalledWith("applicant-1");
  });

  it("closed referrals remain queryable (no status filter in list)", async () => {
    const closedReferral = { ...orgAReferral, status: "closed" as const };
    vi.mocked(repo.listReferralsForSourceOrg).mockResolvedValue([closedReferral]);
    const results = await listReferrals({ ctx: providerCtx, orgId: "org-a", direction: "outgoing" });
    expect(results[0].status).toBe("closed");
  });
});
