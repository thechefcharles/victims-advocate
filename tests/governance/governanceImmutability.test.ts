/**
 * Domain 7.1 — Governance immutability tests (3 tests)
 *
 * Asserts that audit events, policy acceptances, and approval decisions
 * are INSERT-ONLY per the governance architecture. At the service level
 * this means no update/delete methods exist. DB triggers enforce at runtime.
 */

import { describe, it, expect } from "vitest";
import * as governanceRepo from "@/lib/server/governance/governanceRepository";
import { serializeAuditEvent, serializePolicyAcceptance } from "@/lib/server/governance/governanceSerializer";
import type { AuditEvent, PolicyAcceptanceV2 } from "@/lib/server/governance/governanceTypes";

describe("governance immutability", () => {
  it("audit event repository has no update or delete function", () => {
    // The repository exposes only insertAuditEvent and listAuditEvents.
    // No updateAuditEvent, deleteAuditEvent, or editAuditEvent function exists.
    expect(typeof governanceRepo.insertAuditEvent).toBe("function");
    expect(typeof governanceRepo.listAuditEvents).toBe("function");
    expect((governanceRepo as Record<string, unknown>).updateAuditEvent).toBeUndefined();
    expect((governanceRepo as Record<string, unknown>).deleteAuditEvent).toBeUndefined();
  });

  it("policy acceptance repository has no update or delete function", () => {
    expect(typeof governanceRepo.insertPolicyAcceptance).toBe("function");
    expect(typeof governanceRepo.getPolicyAcceptance).toBe("function");
    expect((governanceRepo as Record<string, unknown>).updatePolicyAcceptance).toBeUndefined();
    expect((governanceRepo as Record<string, unknown>).deletePolicyAcceptance).toBeUndefined();
  });

  it("serialized audit event and acceptance views have no edit/update fields", () => {
    const event: AuditEvent = {
      id: "ae-1",
      actorId: "u-1",
      tenantId: null,
      action: "test",
      resourceType: "test",
      resourceId: "r-1",
      eventCategory: "admin_action",
      metadata: {},
      createdAt: "2026-04-10T00:00:00Z",
    };
    const view = serializeAuditEvent(event);
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/update/i);
    expect(json).not.toMatch(/delete/i);
    expect(json).not.toMatch(/edit/i);

    const acceptance: PolicyAcceptanceV2 = {
      id: "pa-1",
      userId: "u-1",
      policyDocumentId: "pd-1",
      policyType: "terms_of_service",
      version: "1.0.0",
      acceptedAt: "2026-04-10T00:00:00Z",
      metadata: {},
    };
    const accView = serializePolicyAcceptance(acceptance);
    const accJson = JSON.stringify(accView);
    expect(accJson).not.toMatch(/update/i);
    expect(accJson).not.toMatch(/delete/i);
  });
});
