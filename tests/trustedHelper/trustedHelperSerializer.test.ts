/**
 * Domain 5.1 — Trusted helper serializer tests (3 tests)
 */

import { describe, it, expect } from "vitest";
import {
  serializeForApplicant,
  serializeForHelperSelf,
  serializeForAdmin,
} from "@/lib/server/trustedHelper/trustedHelperSerializer";
import type { TrustedHelperAccessRow } from "@/lib/server/trustedHelper/trustedHelperTypes";

const mockRow: TrustedHelperAccessRow = {
  id: "grant-1",
  applicant_user_id: "applicant-1",
  helper_user_id: "helper-1",
  relationship_type: "family_member",
  granted_scope: ["case:read", "document:view"],
  granted_scope_detail: {
    allowedActions: ["case:read", "document:view"],
    allowedDomains: ["case", "document"],
    viewOnly: true,
  },
  status: "active",
  granted_at: "2026-04-09T00:00:00Z",
  accepted_at: "2026-04-09T00:05:00Z",
  revoked_at: null,
  expires_at: "2026-05-09T00:00:00Z",
  granted_by_user_id: "applicant-1",
  notes: "Uncle Bob helping with paperwork",
  created_at: "2026-04-09T00:00:00Z",
  updated_at: "2026-04-09T00:05:00Z",
};

describe("trusted helper serializer", () => {
  it("applicant serializer includes management fields (scope summary, allowed actions, revoke controls via status)", () => {
    const view = serializeForApplicant(mockRow);
    expect(view.id).toBe("grant-1");
    expect(view.helper_user_id).toBe("helper-1");
    expect(view.relationship_type).toBe("family_member");
    expect(view.status).toBe("active");
    expect(view.allowed_actions).toEqual(["case:read", "document:view"]);
    expect(view.allowed_domains).toEqual(["case", "document"]);
    expect(view.view_only).toBe(true);
    expect(view.scope_summary).toContain("view-only");
    expect(view.notes).toBe("Uncle Bob helping with paperwork");
  });

  it("helper self-view serializer is scope-limited — does NOT expose notes or revoked_at", () => {
    const view = serializeForHelperSelf(mockRow);
    expect(view.id).toBe("grant-1");
    expect(view.applicant_user_id).toBe("applicant-1");
    expect(view.status).toBe("active");
    expect(view.scope_summary).toContain("view-only");
    expect(view.allowed_domains).toEqual(["case", "document"]);
    // Helper must NOT see internal management fields
    expect((view as Record<string, unknown>).notes).toBeUndefined();
    expect((view as Record<string, unknown>).revoked_at).toBeUndefined();
    expect((view as Record<string, unknown>).allowed_actions).toBeUndefined();
    expect((view as Record<string, unknown>).helper_user_id).toBeUndefined();
  });

  it("admin serializer includes richer metadata (full row — created_by, revoked_at, notes)", () => {
    const view = serializeForAdmin(mockRow);
    expect(view.granted_by_user_id).toBe("applicant-1");
    expect(view.notes).toBe("Uncle Bob helping with paperwork");
    expect(view.granted_scope_detail.allowedActions).toEqual(["case:read", "document:view"]);
    expect(view.expires_at).toBe("2026-05-09T00:00:00Z");
  });
});
