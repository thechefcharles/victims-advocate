/**
 * Domain 4.1 — Referral serializer tests (4 tests)
 *
 * Tests that each serializer exposes only the correct fields.
 */

import { describe, it, expect } from "vitest";
import {
  serializeForSourceOrg,
  serializeForTargetOrg,
  serializeForApplicant,
  serializeForAdmin,
} from "@/lib/server/referrals/referralSerializer";
import type { ReferralRow, ReferralSharePackageRow } from "@/lib/server/referrals/referralTypes";

const mockReferral: ReferralRow = {
  id: "ref-1",
  created_at: "2026-04-09T00:00:00Z",
  updated_at: "2026-04-09T00:00:00Z",
  source_organization_id: "org-a",
  target_organization_id: "org-b",
  applicant_id: "applicant-1",
  initiated_by: "user-source",
  case_id: "case-1",
  support_request_id: null,
  status: "pending_acceptance",
  reason: "Closer to applicant location",
  consent_grant_id: "grant-1",
  responded_at: null,
  responded_by: null,
};

const mockPackage: ReferralSharePackageRow = {
  id: "pkg-1",
  referral_id: "ref-1",
  prepared_by: "user-source",
  prepared_at: "2026-04-09T00:00:00Z",
  consent_grant_id: "grant-1",
  package_type: "basic",
  scoped_data: { applicant_id: "applicant-1", status: "pending_acceptance" },
  doc_ids: ["doc-1", "doc-2"],
};

describe("referral serializer", () => {
  it("target-org serializer strips source-internal fields", () => {
    const view = serializeForTargetOrg(mockReferral, mockPackage);
    expect(view.id).toBe("ref-1");
    expect(view.source_organization_id).toBe("org-a");
    expect(view.share_package).not.toBeNull();
    // Must NOT expose source-internal fields
    expect((view as Record<string, unknown>).reason).toBeUndefined();
    expect((view as Record<string, unknown>).consent_grant_id).toBeUndefined();
    expect((view as Record<string, unknown>).initiated_by).toBeUndefined();
    expect((view as Record<string, unknown>).responded_by).toBeUndefined();
  });

  it("applicant-safe serializer strips all provider-internal details", () => {
    const view = serializeForApplicant(mockReferral);
    expect(view.id).toBe("ref-1");
    expect(view.status).toBe("pending_acceptance");
    expect((view as Record<string, unknown>).reason).toBeUndefined();
    expect((view as Record<string, unknown>).source_organization_id).toBeUndefined();
    expect((view as Record<string, unknown>).target_organization_id).toBeUndefined();
    expect((view as Record<string, unknown>).consent_grant_id).toBeUndefined();
  });

  it("admin serializer returns full row", () => {
    const view = serializeForAdmin(mockReferral);
    expect(view.reason).toBe("Closer to applicant location");
    expect(view.initiated_by).toBe("user-source");
    expect(view.consent_grant_id).toBe("grant-1");
  });

  it("source-org serializer includes share package summary with doc count", () => {
    const view = serializeForSourceOrg(mockReferral, mockPackage);
    expect(view.share_package_summary).toEqual({ prepared: true, doc_count: 2 });
    expect(view.consent_grant_id).toBe("grant-1");
    expect(view.reason).toBe("Closer to applicant location");
  });
});
