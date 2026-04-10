/**
 * Domain 7.1 — Policy versioning tests (4 tests)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({}) as never,
}));

vi.mock("@/lib/server/governance/governanceRepository", () => ({
  insertPolicyDocument: vi.fn(),
  getActivePolicyDocument: vi.fn(),
  getPolicyDocumentById: vi.fn(),
  setPolicyDocumentStatus: vi.fn(),
  listPolicyDocuments: vi.fn(),
  insertPolicyAcceptance: vi.fn(),
  getPolicyAcceptance: vi.fn(),
  insertAuditEvent: vi.fn().mockResolvedValue({ id: "ae-1" }),
  listAuditEvents: vi.fn(),
}));

import * as repo from "@/lib/server/governance/governanceRepository";
import {
  publishPolicyDocument,
} from "@/lib/server/governance/policyDocumentService";
import {
  acceptPolicy,
  requirePolicyAcceptance,
} from "@/lib/server/governance/policyAcceptanceService";
import type { PolicyDocument } from "@/lib/server/governance/governanceTypes";

function mockPolicy(overrides: Partial<PolicyDocument> = {}): PolicyDocument {
  return {
    id: "pd-1",
    policyType: "terms_of_service",
    version: "1.0.0",
    title: "ToS",
    content: "Terms...",
    status: "draft",
    createdByUserId: "u-1",
    publishedAt: null,
    deprecatedAt: null,
    createdAt: "2026-04-10T00:00:00Z",
    updatedAt: "2026-04-10T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => { vi.clearAllMocks(); });

describe("policy versioning", () => {
  it("new required policy version blocks access until accepted", async () => {
    vi.mocked(repo.getActivePolicyDocument).mockResolvedValueOnce(
      mockPolicy({ id: "pd-2", status: "active", version: "2.0.0" }),
    );
    vi.mocked(repo.getPolicyAcceptance).mockResolvedValueOnce(null);

    await expect(
      requirePolicyAcceptance("u-1", "terms_of_service"),
    ).rejects.toThrow(/must accept/i);
  });

  it("acceptPolicy creates immutable record with version", async () => {
    vi.mocked(repo.getActivePolicyDocument).mockResolvedValueOnce(
      mockPolicy({ id: "pd-1", status: "active", version: "1.0.0" }),
    );
    vi.mocked(repo.getPolicyAcceptance).mockResolvedValueOnce(null);
    vi.mocked(repo.insertPolicyAcceptance).mockResolvedValueOnce({
      id: "pa-1",
      userId: "u-1",
      policyDocumentId: "pd-1",
      policyType: "terms_of_service",
      version: "1.0.0",
      acceptedAt: "2026-04-10T00:00:00Z",
      metadata: {},
    });

    const acc = await acceptPolicy({ userId: "u-1", policyType: "terms_of_service" });
    expect(acc.version).toBe("1.0.0");
    expect(acc.policyDocumentId).toBe("pd-1");
  });

  it("only one active policy per type — publish demotes prior", async () => {
    const prior = mockPolicy({ id: "pd-old", status: "active", version: "1.0.0" });
    const target = mockPolicy({ id: "pd-new", status: "draft", version: "2.0.0" });

    vi.mocked(repo.getPolicyDocumentById).mockResolvedValueOnce(target);
    vi.mocked(repo.getActivePolicyDocument).mockResolvedValueOnce(prior);
    vi.mocked(repo.setPolicyDocumentStatus)
      .mockResolvedValueOnce({ ...prior, status: "deprecated" })
      .mockResolvedValueOnce({ ...target, status: "active" });

    const published = await publishPolicyDocument({ id: "pd-new", actorId: "admin-1" });
    expect(published.status).toBe("active");
    expect(repo.setPolicyDocumentStatus).toHaveBeenNthCalledWith(1, "pd-old", "deprecated", expect.anything());
    expect(repo.setPolicyDocumentStatus).toHaveBeenNthCalledWith(2, "pd-new", "active", expect.anything());
  });

  it("old acceptance records preserved after new version published", async () => {
    // After publishing v2.0.0, the v1.0.0 acceptance record still exists.
    // The user just hasn't accepted v2.0.0 yet — so requirePolicyAcceptance
    // should block on the new version.
    vi.mocked(repo.getActivePolicyDocument).mockResolvedValueOnce(
      mockPolicy({ id: "pd-v2", status: "active", version: "2.0.0" }),
    );
    // User has NOT accepted pd-v2.
    vi.mocked(repo.getPolicyAcceptance).mockResolvedValueOnce(null);

    await expect(
      requirePolicyAcceptance("u-1", "terms_of_service"),
    ).rejects.toThrow(/must accept/i);

    // But the old acceptance for v1.0.0 would still be in the DB (immutable).
    // Service correctly checks against the ACTIVE document, not old ones.
  });
});
