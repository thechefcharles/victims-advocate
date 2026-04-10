/**
 * Gap closure — Consent serializer safety tests (3 tests)
 */

import { describe, it, expect } from "vitest";
import {
  serializeForApplicant,
  serializeForProvider,
} from "@/lib/server/consents/consentSerializer";
import type { ConsentGrantRecord, ConsentScopeRecord } from "@/lib/server/consents/consentTypes";

const mockGrant: ConsentGrantRecord = {
  id: "cg-1",
  applicant_id: "user-1",
  granted_to_type: "organization",
  granted_to_id: "org-1",
  purpose_code: "referral_share_basic",
  status: "active",
  effective_at: "2026-04-01T00:00:00Z",
  expires_at: "2027-04-01T00:00:00Z",
  created_at: "2026-04-01T00:00:00Z",
  revoked_at: null,
  revoked_by: null,
  created_by: "user-1",
};

const mockScope: ConsentScopeRecord = {
  id: "cs-1",
  grant_id: "cg-1",
  linked_object_type: "case",
  linked_object_id: "case-1",
  doc_types_covered: ["medical_bill", "police_report"],
  created_at: "2026-04-01T00:00:00Z",
};

describe("consent serializer safety", () => {
  it("applicant serializer includes purpose_code, status, effective dates but NOT created_by or internal metadata", () => {
    const view = serializeForApplicant(mockGrant, mockScope);
    expect(view.purpose_code).toBe("referral_share_basic");
    expect(view.status).toBe("active");
    expect(view.effective_at).toBe("2026-04-01T00:00:00Z");
    const json = JSON.stringify(view);
    // Should NOT include: created_by (internal), applicant_id (redundant — they know who they are)
    expect(json).not.toMatch(/created_by/);
    expect(json).not.toMatch(/applicant_id/);
    // Should include scope info.
    expect(view.linked_object_type).toBe("case");
    expect(view.doc_types_covered).toContain("medical_bill");
  });

  it("provider serializer includes active grant details for their scope", () => {
    const view = serializeForProvider(mockGrant, mockScope);
    expect(view.purpose_code).toBe("referral_share_basic");
    expect(view.status).toBe("active");
    expect(view.linked_object_type).toBe("case");
    expect(view.doc_types_covered).toContain("police_report");
    // Provider does NOT see applicant identity fields.
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/applicant_id/);
    expect(json).not.toMatch(/granted_to_id/);
    expect(json).not.toMatch(/created_by/);
  });

  it("revocation metadata visible in applicant view but not as editable", () => {
    const revokedGrant: ConsentGrantRecord = {
      ...mockGrant,
      status: "revoked",
      revoked_at: "2026-06-01T00:00:00Z",
      revoked_by: "user-1",
    };
    const view = serializeForApplicant(revokedGrant, null);
    expect(view.status).toBe("revoked");
    expect(view.revoked_at).toBe("2026-06-01T00:00:00Z");
    // revoked_by is internal — not in applicant view.
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/revoked_by/);
  });
});
