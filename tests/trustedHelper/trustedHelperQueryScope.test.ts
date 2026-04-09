/**
 * Domain 5.1 — Trusted helper query scope tests (4 tests)
 *
 * Verifies that list queries route correctly and scope boundaries are respected.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrustedHelperAccessRow } from "@/lib/server/trustedHelper/trustedHelperTypes";

const row: TrustedHelperAccessRow = {
  id: "grant-1",
  applicant_user_id: "applicant-1",
  helper_user_id: "helper-1",
  relationship_type: "family_member",
  granted_scope: ["case:read"],
  granted_scope_detail: { allowedActions: ["case:read"], allowedDomains: ["case"] },
  status: "active",
  granted_at: "2026-04-09T00:00:00Z",
  accepted_at: "2026-04-09T00:05:00Z",
  revoked_at: null,
  expires_at: null,
  granted_by_user_id: "applicant-1",
  notes: null,
  created_at: "2026-04-09T00:00:00Z",
  updated_at: "2026-04-09T00:05:00Z",
};

const revokedRow: TrustedHelperAccessRow = {
  ...row,
  id: "grant-old",
  status: "revoked",
  revoked_at: "2026-04-08T00:00:00Z",
};

vi.mock("@/lib/server/trustedHelper/trustedHelperRepository", () => ({
  listTrustedHelperAccessByApplicantId: vi.fn(),
  listTrustedHelperAccessByHelperUserId: vi.fn(),
  getTrustedHelperAccessById: vi.fn(),
  findActiveGrantForPair: vi.fn(),
  createTrustedHelperAccess: vi.fn(),
  updateTrustedHelperAccessStatus: vi.fn(),
  updateTrustedHelperAccessScope: vi.fn(),
  createTrustedHelperEvent: vi.fn(),
  listTrustedHelperEventsByGrantId: vi.fn(),
}));

import {
  listMyTrustedHelperGrants,
  listGrantsWhereIAmTheHelper,
  listAuditEventsForGrant,
} from "@/lib/server/trustedHelper/trustedHelperService";
import * as repo from "@/lib/server/trustedHelper/trustedHelperRepository";

const applicantCtx = {
  userId: "applicant-1",
  accountType: "applicant" as const,
  orgId: null,
} as Parameters<typeof listMyTrustedHelperGrants>[0]["ctx"];

const helperCtx = {
  userId: "helper-1",
  accountType: "applicant" as const,
  orgId: null,
} as Parameters<typeof listGrantsWhereIAmTheHelper>[0]["ctx"];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("trusted helper query scope", () => {
  it("applicant sees own grants via listTrustedHelperAccessByApplicantId", async () => {
    vi.mocked(repo.listTrustedHelperAccessByApplicantId).mockResolvedValue([row, revokedRow]);
    const results = await listMyTrustedHelperGrants({ ctx: applicantCtx });
    expect(repo.listTrustedHelperAccessByApplicantId).toHaveBeenCalledWith("applicant-1");
    expect(results).toHaveLength(2);
  });

  it("helper sees only grants where they are the helper party", async () => {
    vi.mocked(repo.listTrustedHelperAccessByHelperUserId).mockResolvedValue([row]);
    const results = await listGrantsWhereIAmTheHelper({ ctx: helperCtx, onlyActive: true });
    expect(repo.listTrustedHelperAccessByHelperUserId).toHaveBeenCalledWith("helper-1", {
      onlyActive: true,
    });
    expect(results).toHaveLength(1);
    expect(results[0].helper_user_id).toBe("helper-1");
  });

  it("revoked/expired grants remain historically queryable for the applicant owner", async () => {
    // Applicant list is NOT filtered by status — historical grants included
    vi.mocked(repo.listTrustedHelperAccessByApplicantId).mockResolvedValue([row, revokedRow]);
    const results = await listMyTrustedHelperGrants({ ctx: applicantCtx });
    const statuses = results.map((r) => r.status);
    expect(statuses).toContain("active");
    expect(statuses).toContain("revoked");
  });

  it("audit events query denies non-owner", async () => {
    vi.mocked(repo.getTrustedHelperAccessById).mockResolvedValue(row);
    const strangerCtx = {
      userId: "stranger-1",
      accountType: "applicant" as const,
      orgId: null,
    } as Parameters<typeof listAuditEventsForGrant>[0]["ctx"];
    await expect(
      listAuditEventsForGrant({ ctx: strangerCtx, id: "grant-1" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
