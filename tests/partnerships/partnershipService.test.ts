/**
 * Domain 7.5 — partnershipService tests.
 *
 * Verifies status-transition rules, admin-only writes, and member-scoped reads.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({}) as never,
}));

import {
  getOrgPartnerships,
  createPartnership,
  updatePartnershipStatus,
  getExpiringPartnerships,
} from "@/lib/server/partnerships/partnershipService";
import { AppError } from "@/lib/server/api";
import type { AuthContext } from "@/lib/server/auth";

const adminCtx = {
  userId: "u-admin",
  isAdmin: true,
  orgId: null,
} as unknown as AuthContext;

const memberCtx = {
  userId: "u-member",
  isAdmin: false,
  orgId: "org-1",
} as unknown as AuthContext;

const outsiderCtx = {
  userId: "u-outside",
  isAdmin: false,
  orgId: "org-other",
} as unknown as AuthContext;

const samplePartnership = {
  id: "p-1",
  organization_id: "org-1",
  partner_type: "voca_direct",
  partnership_status: "active",
  partner_name: "ICJIA",
  partner_organization_id: null,
  effective_date: "2025-10-01",
  expiration_date: "2026-09-30",
  auto_renew: false,
  voca_grant_year: "FY26",
  voca_award_amount_cents: null,
  voca_services_funded: ["case_management"],
  bedside_intake_enabled: false,
  bedside_location_name: null,
  notes: null,
  created_by: "u-admin",
  created_at: "2025-10-01T00:00:00Z",
  updated_at: "2025-10-01T00:00:00Z",
};

function builder(result: { data?: unknown; error?: { message: string } | null }) {
  const chain: Record<string, unknown> = {};
  const fn = () => chain;
  for (const k of [
    "select",
    "eq",
    "neq",
    "gte",
    "lte",
    "not",
    "in",
    "order",
    "insert",
    "update",
    "delete",
    "limit",
  ]) {
    chain[k] = vi.fn(fn);
  }
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
  chain.single = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(resolve);
  return chain;
}

function clientWith(result: { data?: unknown; error?: { message: string } | null }) {
  return { from: vi.fn(() => builder(result)) } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("partnershipService.getOrgPartnerships", () => {
  it("admin can read any org's partnerships", async () => {
    const supabase = clientWith({ data: [samplePartnership] });
    const rows = await getOrgPartnerships("org-1", adminCtx, supabase);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("p-1");
  });

  it("member can read their own org", async () => {
    const supabase = clientWith({ data: [samplePartnership] });
    const rows = await getOrgPartnerships("org-1", memberCtx, supabase);
    expect(rows).toHaveLength(1);
  });

  it("non-member is forbidden", async () => {
    const supabase = clientWith({ data: [] });
    await expect(getOrgPartnerships("org-1", outsiderCtx, supabase)).rejects.toBeInstanceOf(
      AppError,
    );
  });
});

describe("partnershipService.createPartnership", () => {
  it("non-admin is forbidden", async () => {
    const supabase = clientWith({ data: samplePartnership });
    await expect(
      createPartnership(
        memberCtx,
        {
          organizationId: "org-1",
          partnerType: "voca_direct",
          partnershipStatus: "active",
        },
        supabase,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("admin creates and audit logs", async () => {
    const { logEvent } = await import("@/lib/server/audit/logEvent");
    const supabase = clientWith({ data: samplePartnership });
    const created = await createPartnership(
      adminCtx,
      {
        organizationId: "org-1",
        partnerType: "voca_direct",
        partnershipStatus: "active",
        vocaGrantYear: "FY26",
      },
      supabase,
    );
    expect(created.id).toBe("p-1");
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "partnership.created", resourceId: "p-1" }),
    );
  });
});

describe("partnershipService.updatePartnershipStatus", () => {
  it("rejects invalid transition (active -> pending)", async () => {
    const supabase = clientWith({ data: samplePartnership });
    await expect(
      updatePartnershipStatus(adminCtx, "p-1", "pending", null, supabase),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects transitions out of terminal state", async () => {
    const supabase = clientWith({
      data: { ...samplePartnership, partnership_status: "terminated" },
    });
    await expect(
      updatePartnershipStatus(adminCtx, "p-1", "active", null, supabase),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("non-admin is forbidden", async () => {
    const supabase = clientWith({ data: samplePartnership });
    await expect(
      updatePartnershipStatus(memberCtx, "p-1", "under_renewal", null, supabase),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("404 when partnership missing", async () => {
    const supabase = clientWith({ data: null });
    await expect(
      updatePartnershipStatus(adminCtx, "missing", "active", null, supabase),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("partnershipService.getExpiringPartnerships", () => {
  it("rejects negative daysAhead", async () => {
    const supabase = clientWith({ data: [] });
    await expect(getExpiringPartnerships(-1, supabase)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("returns rows from query", async () => {
    const supabase = clientWith({ data: [samplePartnership] });
    const rows = await getExpiringPartnerships(30, supabase);
    expect(rows).toHaveLength(1);
  });
});
