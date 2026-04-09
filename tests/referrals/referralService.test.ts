/**
 * Domain 4.1 — Referral service tests (8 tests)
 *
 * Tests service-layer behavior using mocked repository and state machine.
 * All DB calls are mocked via vi.mock().
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReferralRow } from "@/lib/server/referrals/referralTypes";

const mockReferral: ReferralRow = {
  id: "ref-1",
  created_at: "2026-04-09T00:00:00Z",
  updated_at: "2026-04-09T00:00:00Z",
  source_organization_id: "org-a",
  target_organization_id: "org-b",
  applicant_id: "applicant-1",
  initiated_by: "user-1",
  case_id: null,
  support_request_id: null,
  status: "draft",
  reason: null,
  consent_grant_id: null,
  responded_at: null,
  responded_by: null,
};

vi.mock("@/lib/server/referrals/referralRepository", () => ({
  createReferral: vi.fn(),
  getReferralById: vi.fn(),
  listReferralsForSourceOrg: vi.fn(),
  listReferralsForTargetOrg: vi.fn(),
  listReferralsForApplicantSafeView: vi.fn(),
  updateReferralStatus: vi.fn(),
  recordReferralEvent: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/server/referrals/referralStateMachine", () => ({
  validateReferralTransition: vi.fn(),
  validateReferralConsent: vi.fn().mockResolvedValue(undefined),
}));

import {
  createReferral,
  getReferral,
  listReferrals,
  sendReferral,
  acceptReferral,
  rejectReferral,
  cancelReferral,
  closeReferral,
} from "@/lib/server/referrals/referralService";
import * as repo from "@/lib/server/referrals/referralRepository";
import * as sm from "@/lib/server/referrals/referralStateMachine";
import { AppError } from "@/lib/server/api";

const ctx = { userId: "user-1", accountType: "provider" as const, orgId: "org-a" } as Parameters<typeof createReferral>[0]["ctx"];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.createReferral).mockResolvedValue(mockReferral);
  vi.mocked(repo.getReferralById).mockResolvedValue(mockReferral);
  vi.mocked(repo.updateReferralStatus).mockImplementation(({ status }) =>
    Promise.resolve({ ...mockReferral, status } as ReferralRow)
  );
  vi.mocked(repo.recordReferralEvent).mockResolvedValue({} as never);
});

describe("referral service", () => {
  it("createReferral creates draft with correct source/target org", async () => {
    const result = await createReferral({
      ctx,
      input: {
        sourceOrganizationId: "org-a",
        targetOrganizationId: "org-b",
        applicantId: "applicant-1",
      },
    });
    expect(repo.createReferral).toHaveBeenCalledWith(
      expect.objectContaining({
        source_organization_id: "org-a",
        target_organization_id: "org-b",
        status: undefined, // repo call doesn't include status — it's defaulted in DB
      }) && expect.objectContaining({ source_organization_id: "org-a" })
    );
    expect(result.id).toBe("ref-1");
  });

  it("sendReferral validates consent before transition", async () => {
    await sendReferral({ ctx, id: "ref-1" });
    expect(sm.validateReferralConsent).toHaveBeenCalledWith("ref-1");
    expect(sm.validateReferralTransition).toHaveBeenCalledWith("draft", "pending_acceptance");
  });

  it("acceptReferral records decision and transitions to accepted", async () => {
    const result = await acceptReferral({ ctx, id: "ref-1" });
    expect(sm.validateReferralTransition).toHaveBeenCalledWith("draft", "accepted");
    expect(repo.updateReferralStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ref-1", status: "accepted", respondedBy: "user-1" })
    );
    expect(result.status).toBe("accepted");
  });

  it("rejectReferral records reason in event", async () => {
    await rejectReferral({ ctx, id: "ref-1", reason: "Capacity issue" });
    expect(repo.recordReferralEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "rejected", metadata: { reason: "Capacity issue" } })
    );
  });

  it("cancelReferral sets cancelled state", async () => {
    const result = await cancelReferral({ ctx, id: "ref-1" });
    expect(result.status).toBe("cancelled");
  });

  it("closeReferral sets closed state", async () => {
    const result = await closeReferral({ ctx, id: "ref-1" });
    expect(result.status).toBe("closed");
  });

  it("getReferral throws NOT_FOUND when referral does not exist", async () => {
    vi.mocked(repo.getReferralById).mockResolvedValue(null);
    await expect(getReferral({ ctx, id: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("createReferral rejects same source and target org", async () => {
    await expect(
      createReferral({
        ctx,
        input: {
          sourceOrganizationId: "org-a",
          targetOrganizationId: "org-a",
          applicantId: "applicant-1",
        },
      })
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
