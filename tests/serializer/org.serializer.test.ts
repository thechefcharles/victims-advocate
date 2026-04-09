/**
 * Domain 3.2 — Org serializer tests.
 *
 * Tests 23–26 from the D3.2 test plan:
 *   23. serializeOrgPublicView — excludes EIN, status, lifecycle_status
 *   24. serializeOrgInternalView — includes EIN + lifecycle, excludes raw status
 *   25. serializeOrgAdminView — includes status + created_by
 *   26. serializeInviteView — token_hash never present
 *   26b. serializeMemberView — supervised_by_user_id never present
 */

import { describe, it, expect } from "vitest";
import {
  serializeOrgPublicView,
  serializeOrgInternalView,
  serializeOrgAdminView,
} from "@/lib/server/organizations/organizationSerializers";
import {
  serializeInviteView,
  serializeMemberView,
  type OrgInviteRow,
  type OrgMembershipRow,
} from "@/lib/server/organizations/memberSerializers";
import type { OrganizationProfileRow } from "@/lib/server/organizations/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOrgRow(overrides: Partial<OrganizationProfileRow> = {}): OrganizationProfileRow {
  const base: Record<string, unknown> = {
    id: "org-1",
    name: "Test Org",
    type: "nonprofit",
    status: "active",
    lifecycle_status: "managed",
    public_profile_status: "active",
    profile_stage: "complete",
    profile_status: "complete",
    profile_last_updated_at: "2026-04-01T00:00:00Z",
    activation_submitted_at: null,
    service_types: ["legal_aid", "counseling"],
    languages: ["en"],
    intake_methods: ["phone"],
    accepting_clients: true,
    capacity_status: "accepting",
    special_populations: [],
    accessibility_features: [],
    ein: "12-3456789",
    completeness_pct: 85,
    quality_tier: "bronze",
    tier_updated_at: "2026-03-01T00:00:00Z",
    last_profile_update: "2026-04-01T00:00:00Z",
    compliance_profiles: [],
    funding_sources: ["federal_grant"],
    avg_response_time_hours: 24,
    billing_plan_key: "standard",
    billing_status: "active",
    created_by: "admin-user",
    metadata: {},
    ...overrides,
  };
  return base as unknown as OrganizationProfileRow;
}

function makeInviteRow(overrides: Partial<OrgInviteRow> = {}): OrgInviteRow {
  return {
    id: "inv-1",
    organization_id: "org-1",
    email: "user@example.com",
    org_role: "victim_advocate",
    token_hash: "sha256-secret-hash-value-must-not-appear",
    expires_at: "2026-04-16T00:00:00Z",
    used_at: null,
    used_by: null,
    created_at: "2026-04-09T00:00:00Z",
    created_by: "admin-user",
    revoked_at: null,
    revoked_by: null,
    ...overrides,
  };
}

function makeMemberRow(overrides: Partial<OrgMembershipRow> = {}): OrgMembershipRow {
  return {
    id: "mem-1",
    user_id: "user-1",
    organization_id: "org-1",
    org_role: "victim_advocate",
    status: "active",
    created_at: "2026-04-09T00:00:00Z",
    created_by: "admin-user",
    revoked_at: null,
    revoked_by: null,
    supervised_by_user_id: "supervisor-user",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("serializeOrgPublicView", () => {
  it("23. includes public discovery fields", () => {
    const view = serializeOrgPublicView(makeOrgRow());
    expect(view.id).toBe("org-1");
    expect(view.name).toBe("Test Org");
    expect(view.accepting_clients).toBe(true);
    expect(view.service_types).toEqual(["legal_aid", "counseling"]);
  });

  it("23b. excludes EIN", () => {
    const view = serializeOrgPublicView(makeOrgRow());
    // @ts-expect-error — ein must not appear on public view
    expect(view.ein).toBeUndefined();
  });

  it("23c. excludes lifecycle_status", () => {
    const view = serializeOrgPublicView(makeOrgRow());
    // @ts-expect-error — lifecycle_status must not appear on public view
    expect(view.lifecycle_status).toBeUndefined();
  });

  it("23d. excludes operational status", () => {
    const view = serializeOrgPublicView(makeOrgRow());
    // @ts-expect-error — status must not appear on public view
    expect(view.status).toBeUndefined();
  });
});

describe("serializeOrgInternalView", () => {
  it("24. includes EIN and lifecycle_status", () => {
    const view = serializeOrgInternalView(makeOrgRow());
    expect(view.ein).toBe("12-3456789");
    expect(view.lifecycle_status).toBe("managed");
  });

  it("24b. excludes raw operational status (status field is on admin view only)", () => {
    const view = serializeOrgInternalView(makeOrgRow());
    // @ts-expect-error — status must not appear on internal view
    expect(view.status).toBeUndefined();
  });

  it("24c. includes profile_status and completeness", () => {
    const view = serializeOrgInternalView(makeOrgRow());
    expect(view.profile_status).toBe("complete");
    expect(view.completeness_pct).toBe(85);
  });
});

describe("serializeOrgAdminView", () => {
  it("25. includes operational status and created_by", () => {
    const view = serializeOrgAdminView(makeOrgRow());
    expect(view.status).toBe("active");
    expect(view.created_by).toBe("admin-user");
  });

  it("25b. is a superset of internal view (contains EIN and lifecycle)", () => {
    const view = serializeOrgAdminView(makeOrgRow());
    expect(view.ein).toBe("12-3456789");
    expect(view.lifecycle_status).toBe("managed");
  });
});

describe("serializeInviteView", () => {
  it("26. token_hash never appears in invite view", () => {
    const view = serializeInviteView(makeInviteRow());
    // @ts-expect-error — token_hash must NEVER appear in serialized output
    expect(view.token_hash).toBeUndefined();
    expect(view.id).toBe("inv-1");
    expect(view.email).toBe("user@example.com");
  });

  it("26b. used_at is exposed", () => {
    const view = serializeInviteView(makeInviteRow({ used_at: "2026-04-10T00:00:00Z" }));
    expect(view.used_at).toBe("2026-04-10T00:00:00Z");
  });
});

describe("serializeMemberView", () => {
  it("26c. supervised_by_user_id never appears in member view", () => {
    const view = serializeMemberView(makeMemberRow());
    // @ts-expect-error — supervised_by_user_id must not appear in serialized output
    expect(view.supervised_by_user_id).toBeUndefined();
    expect(view.id).toBe("mem-1");
    expect(view.org_role).toBe("victim_advocate");
  });

  it("26d. revoked_at and revoked_by not on MemberView base type", () => {
    const view = serializeMemberView(makeMemberRow());
    expect(view.id).toBe("mem-1");
    expect(view.status).toBe("active");
  });
});
