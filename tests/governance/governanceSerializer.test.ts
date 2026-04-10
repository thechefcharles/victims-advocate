/**
 * Domain 7.1 — Governance serializer tests (2 tests)
 */

import { describe, it, expect } from "vitest";
import {
  serializeAuditEvent,
  serializePolicyAcceptance,
  serializePolicyForPublic,
} from "@/lib/server/governance/governanceSerializer";
import type { AuditEvent, PolicyAcceptanceV2, PolicyDocument } from "@/lib/server/governance/governanceTypes";

describe("governance serializer", () => {
  it("audit event serializer has no edit/update fields — read-only shape", () => {
    const event: AuditEvent = {
      id: "ae-1",
      actorId: "u-1",
      tenantId: "org-1",
      action: "score_methodology:publish",
      resourceType: "score_methodology",
      resourceId: "sm-1",
      eventCategory: "trust_scoring",
      metadata: { version: "1.0.0" },
      createdAt: "2026-04-10T00:00:00Z",
    };
    const view = serializeAuditEvent(event);
    const keys = Object.keys(view);

    // Read-only fields only.
    expect(keys).toContain("id");
    expect(keys).toContain("actorId");
    expect(keys).toContain("action");
    expect(keys).toContain("createdAt");

    // No mutability affordances.
    expect(keys).not.toContain("updatedAt");
    expect(keys).not.toContain("deletedAt");

    const json = JSON.stringify(view);
    expect(json).not.toMatch(/update/i);
    expect(json).not.toMatch(/delete/i);
  });

  it("policy acceptance serializer is read-only — no edit paths", () => {
    const acc: PolicyAcceptanceV2 = {
      id: "pa-1",
      userId: "u-1",
      policyDocumentId: "pd-1",
      policyType: "terms_of_service",
      version: "1.0.0",
      acceptedAt: "2026-04-10T00:00:00Z",
      metadata: {},
    };
    const view = serializePolicyAcceptance(acc);
    // Only exposes: id, policyType, version, acceptedAt — no userId (PII), no metadata, no mutation paths.
    expect(Object.keys(view).sort()).toEqual(["acceptedAt", "id", "policyType", "version"]);
    expect(view.version).toBe("1.0.0");

    // Public policy view is also safe.
    const doc: PolicyDocument = {
      id: "pd-1",
      policyType: "terms_of_service",
      version: "1.0.0",
      title: "Terms of Service",
      content: "You agree...",
      status: "active",
      createdByUserId: "admin-1",
      publishedAt: "2026-04-10T00:00:00Z",
      deprecatedAt: null,
      createdAt: "2026-04-10T00:00:00Z",
      updatedAt: "2026-04-10T00:00:00Z",
    };
    const pubView = serializePolicyForPublic(doc);
    const pubJson = JSON.stringify(pubView);
    // Public view must not expose createdByUserId or status.
    expect(pubJson).not.toMatch(/createdByUserId/);
    expect(pubJson).not.toMatch(/status/);
  });
});
