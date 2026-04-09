/**
 * Domain 5.1 — Trusted helper service tests (7 tests)
 *
 * Covers the service lifecycle + resolveTrustedHelperScope — the central
 * runtime authorization gate.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrustedHelperAccessRow } from "@/lib/server/trustedHelper/trustedHelperTypes";

const baseGrant: TrustedHelperAccessRow = {
  id: "grant-1",
  applicant_user_id: "applicant-1",
  helper_user_id: "helper-1",
  relationship_type: "family_member",
  granted_scope: ["case:read"],
  granted_scope_detail: {
    allowedActions: ["case:read", "document:view"],
    allowedDomains: ["case", "document"],
  },
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

vi.mock("@/lib/server/trustedHelper/trustedHelperRepository", () => ({
  getTrustedHelperAccessById: vi.fn(),
  listTrustedHelperAccessByApplicantId: vi.fn(),
  listTrustedHelperAccessByHelperUserId: vi.fn(),
  findActiveGrantForPair: vi.fn(),
  createTrustedHelperAccess: vi.fn(),
  updateTrustedHelperAccessStatus: vi.fn(),
  updateTrustedHelperAccessScope: vi.fn(),
  createTrustedHelperEvent: vi.fn(),
  listTrustedHelperEventsByGrantId: vi.fn(),
}));

import {
  createTrustedHelperAccess,
  revokeTrustedHelperAccess,
  updateTrustedHelperScope,
  resolveTrustedHelperScope,
} from "@/lib/server/trustedHelper/trustedHelperService";
import * as repo from "@/lib/server/trustedHelper/trustedHelperRepository";

const applicantCtx = {
  userId: "applicant-1",
  accountType: "applicant" as const,
  orgId: null,
} as Parameters<typeof createTrustedHelperAccess>[0]["ctx"];

const helperActor = {
  userId: "helper-1",
  accountType: "applicant" as const,
  activeRole: null,
  tenantId: null,
  tenantType: null,
  isAdmin: false,
  supportMode: false,
  safetyModeEnabled: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.getTrustedHelperAccessById).mockResolvedValue(baseGrant);
  vi.mocked(repo.createTrustedHelperAccess).mockResolvedValue({
    ...baseGrant,
    status: "pending",
  });
  vi.mocked(repo.updateTrustedHelperAccessStatus).mockImplementation(({ status }) =>
    Promise.resolve({ ...baseGrant, status } as TrustedHelperAccessRow),
  );
  vi.mocked(repo.updateTrustedHelperAccessScope).mockImplementation(({ granted_scope_detail }) =>
    Promise.resolve({ ...baseGrant, granted_scope_detail } as TrustedHelperAccessRow),
  );
  vi.mocked(repo.createTrustedHelperEvent).mockResolvedValue({} as never);
  vi.mocked(repo.findActiveGrantForPair).mockResolvedValue(baseGrant);
  vi.mocked(repo.listTrustedHelperAccessByHelperUserId).mockResolvedValue([]);
});

describe("trusted helper service", () => {
  it("createTrustedHelperAccess creates with explicit granted_scope_detail shape", async () => {
    const result = await createTrustedHelperAccess({
      ctx: applicantCtx,
      input: {
        applicant_user_id: "applicant-1",
        helper_user_id: "helper-1",
        relationship_type: "family_member",
        granted_scope_detail: {
          allowedActions: ["case:read"],
          allowedDomains: ["case"],
        },
      },
    });
    expect(repo.createTrustedHelperAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        applicant_user_id: "applicant-1",
        helper_user_id: "helper-1",
        granted_scope_detail: expect.objectContaining({
          allowedActions: ["case:read"],
          allowedDomains: ["case"],
        }),
      }),
    );
    expect(result.status).toBe("pending");
    expect(repo.createTrustedHelperEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "granted" }),
    );
  });

  it("createTrustedHelperAccess rejects empty scope", async () => {
    await expect(
      createTrustedHelperAccess({
        ctx: applicantCtx,
        input: {
          applicant_user_id: "applicant-1",
          helper_user_id: "helper-1",
          granted_scope_detail: { allowedActions: [], allowedDomains: [] },
        },
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("revokeTrustedHelperAccess immediately sets revoked + writes audit event", async () => {
    const result = await revokeTrustedHelperAccess({
      ctx: applicantCtx,
      id: "grant-1",
      reason: "no longer needed",
    });
    expect(repo.updateTrustedHelperAccessStatus).toHaveBeenCalledWith({
      id: "grant-1",
      status: "revoked",
      setRevokedAt: true,
    });
    expect(result.status).toBe("revoked");
    expect(repo.createTrustedHelperEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "revoked",
        metadata: { reason: "no longer needed" },
      }),
    );
  });

  it("updateTrustedHelperScope updates scope on active grant", async () => {
    const newScope = {
      allowedActions: ["case:read", "document:view"],
      allowedDomains: ["case", "document"],
      viewOnly: true,
    };
    const result = await updateTrustedHelperScope({
      ctx: applicantCtx,
      id: "grant-1",
      input: { granted_scope_detail: newScope },
    });
    expect(repo.updateTrustedHelperAccessScope).toHaveBeenCalledWith({
      id: "grant-1",
      granted_scope_detail: newScope,
    });
    expect(result.granted_scope_detail.viewOnly).toBe(true);
    expect(repo.createTrustedHelperEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "scope_updated" }),
    );
  });

  it("resolveTrustedHelperScope returns ALLOW for valid in-scope action", async () => {
    const decision = await resolveTrustedHelperScope(helperActor, "applicant-1", "case:read");
    expect(decision.allowed).toBe(true);
    expect(decision.grantId).toBe("grant-1");
    expect(decision.deniedReason).toBeNull();
  });

  it("resolveTrustedHelperScope returns DENY with 'revoked' reason for revoked grant", async () => {
    vi.mocked(repo.findActiveGrantForPair).mockResolvedValue(null);
    vi.mocked(repo.listTrustedHelperAccessByHelperUserId).mockResolvedValue([
      { ...baseGrant, status: "revoked" },
    ]);
    const decision = await resolveTrustedHelperScope(helperActor, "applicant-1", "case:read");
    expect(decision.allowed).toBe(false);
    expect(decision.deniedReason).toBe("revoked");
  });

  it("resolveTrustedHelperScope returns DENY with 'expired' reason when expires_at has passed", async () => {
    const pastExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    vi.mocked(repo.findActiveGrantForPair).mockResolvedValue({
      ...baseGrant,
      expires_at: pastExpiry,
    });
    const decision = await resolveTrustedHelperScope(helperActor, "applicant-1", "case:read");
    expect(decision.allowed).toBe(false);
    expect(decision.deniedReason).toBe("expired");
  });
});
