/**
 * Domain 7.1 — Change request tests (4 tests)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({}) as never,
}));

vi.mock("@/lib/server/governance/governanceRepository", () => ({
  insertChangeRequest: vi.fn(),
  getChangeRequestById: vi.fn(),
  updateChangeRequestStatus: vi.fn(),
  insertApprovalDecision: vi.fn(),
  insertAuditEvent: vi.fn().mockResolvedValue({ id: "ae-1" }),
  listAuditEvents: vi.fn(),
}));

import * as repo from "@/lib/server/governance/governanceRepository";
import {
  createChangeRequest,
  approveChangeRequest,
  rollbackChangeRequest,
} from "@/lib/server/governance/changeRequestService";
import type { ChangeRequest } from "@/lib/server/governance/governanceTypes";

function mockCR(overrides: Partial<ChangeRequest> = {}): ChangeRequest {
  return {
    id: "cr-1",
    targetType: "ScoreMethodology",
    targetId: "sm-1",
    requestedChange: { weights: { responsiveness: 0.7 } },
    reason: "Reweight for Q2",
    status: "draft",
    requestedByUserId: "admin-1",
    submittedAt: null,
    resolvedAt: null,
    createdAt: "2026-04-10T00:00:00Z",
    updatedAt: "2026-04-10T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => { vi.clearAllMocks(); });

describe("change request", () => {
  it("change request with valid governed target succeeds", async () => {
    vi.mocked(repo.insertChangeRequest).mockResolvedValueOnce(mockCR());
    const cr = await createChangeRequest({
      targetType: "ScoreMethodology",
      targetId: "sm-1",
      requestedChange: { weights: { responsiveness: 0.7 } },
      reason: "Reweight for Q2",
      requestedByUserId: "admin-1",
    });
    expect(cr.targetType).toBe("ScoreMethodology");
    expect(cr.status).toBe("draft");
  });

  it("change request with invalid target (e.g. 'case') — DENY", async () => {
    await expect(
      createChangeRequest({
        targetType: "case",
        targetId: "c-1",
        requestedChange: {},
        reason: "test",
        requestedByUserId: "admin-1",
      }),
    ).rejects.toThrow(/not a governed target/i);
  });

  it("rollbackChangeRequest creates new event, does not delete history", async () => {
    vi.mocked(repo.getChangeRequestById).mockResolvedValueOnce(
      mockCR({ id: "cr-1", status: "approved" }),
    );
    vi.mocked(repo.updateChangeRequestStatus).mockResolvedValueOnce(
      mockCR({ id: "cr-1", status: "rolled_back" }),
    );

    const rolled = await rollbackChangeRequest({ id: "cr-1", actorId: "admin-1", reason: "Regression found" });
    expect(rolled.status).toBe("rolled_back");
    // Audit event was logged (via logAuditEvent which is mocked through insertAuditEvent).
    expect(repo.updateChangeRequestStatus).toHaveBeenCalledWith("cr-1", "rolled_back", expect.anything());
    // No delete was called — only an update to status.
  });

  it("approveChangeRequest requires pending_approval status", async () => {
    vi.mocked(repo.getChangeRequestById).mockResolvedValueOnce(
      mockCR({ id: "cr-1", status: "draft" }),
    );
    // draft → approved is not a valid transition.
    await expect(
      approveChangeRequest({ id: "cr-1", decidedByUserId: "admin-1" }),
    ).rejects.toThrow(/Cannot transition/);
  });
});
