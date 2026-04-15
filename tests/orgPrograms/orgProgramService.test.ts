/**
 * Domain 3.6 — orgProgramService tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/server/trustSignal", () => ({
  emitSignal: vi.fn().mockResolvedValue({ success: true, signalId: "sig-1" }),
}));
vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({}) as never,
}));

import {
  createProgram,
  updateProgram,
  updateProgramStatus,
} from "@/lib/server/orgPrograms/orgProgramService";
import type { AuthContext } from "@/lib/server/auth";

const adminCtx = {
  userId: "u-admin",
  isAdmin: true,
  orgId: null,
  orgRole: null,
  accountType: "admin",
} as unknown as AuthContext;

const ownerCtx = {
  userId: "u-owner",
  isAdmin: false,
  orgId: "org-1",
  orgRole: "org_owner",
  accountType: "provider",
} as unknown as AuthContext;

const advocateCtx = {
  userId: "u-adv",
  isAdmin: false,
  orgId: "org-1",
  orgRole: "victim_advocate",
  accountType: "provider",
} as unknown as AuthContext;

const sample = {
  id: "p-1",
  organization_id: "org-1",
  program_name: "Crisis Counseling",
  program_type: "counseling",
  description: null,
  service_types: [],
  crime_types_served: [],
  eligibility_criteria: null,
  languages: ["en"],
  accepting_referrals: true,
  capacity_status: "open",
  min_age: null,
  max_age: null,
  serves_minors: false,
  geographic_coverage: [],
  is_active: true,
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
};

function client(rows: { select?: unknown; update?: unknown; rpc?: unknown } = {}) {
  const selectVal = "select" in rows ? rows.select : sample;
  const updateVal = "update" in rows ? rows.update : sample;
  const insertChain = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: selectVal, error: null }),
  };
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: updateVal, error: null }),
  };
  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: selectVal, error: null }),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({
        data: selectVal === null ? [] : [selectVal],
        error: null,
      }).then(resolve),
  };
  return {
    from: vi.fn(() => ({
      insert: vi.fn(() => insertChain),
      update: vi.fn(() => updateChain),
      select: vi.fn(() => selectChain),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  } as never;
}

beforeEach(() => vi.clearAllMocks());

describe("orgProgramService.createProgram", () => {
  it("non-manager is forbidden", async () => {
    await expect(
      createProgram(
        advocateCtx,
        "org-1",
        { programName: "X", programType: "counseling" },
        client(),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects empty name", async () => {
    await expect(
      createProgram(
        ownerCtx,
        "org-1",
        { programName: "  ", programType: "counseling" },
        client(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("owner creates and refreshes search index", async () => {
    const supabase = client();
    const created = await createProgram(
      ownerCtx,
      "org-1",
      { programName: "Crisis Counseling", programType: "counseling" },
      supabase,
    );
    expect(created.id).toBe("p-1");
    // refresh RPC fired exactly once
    expect((supabase as { rpc: ReturnType<typeof vi.fn> }).rpc).toHaveBeenCalledWith(
      "refresh_provider_search_index_programs",
      { target_org: "org-1" },
    );
  });

  it("admin can create on any org", async () => {
    const supabase = client();
    const created = await createProgram(
      adminCtx,
      "org-1",
      { programName: "Crisis Counseling", programType: "counseling" },
      supabase,
    );
    expect(created.id).toBe("p-1");
  });
});

describe("orgProgramService.updateProgram", () => {
  it("404 when program missing", async () => {
    const supabase = client({ select: null, update: sample });
    await expect(
      updateProgram(ownerCtx, "missing", { description: "x" }, supabase),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("non-manager is forbidden", async () => {
    const supabase = client();
    await expect(
      updateProgram(advocateCtx, "p-1", { description: "x" }, supabase),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("orgProgramService.updateProgramStatus", () => {
  it("requires at least one field", async () => {
    const supabase = client();
    await expect(
      updateProgramStatus(ownerCtx, "p-1", {}, supabase),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("emits trust signal when capacity_status changes", async () => {
    const { emitSignal } = await import("@/lib/server/trustSignal");
    const supabase = client({
      select: sample, // existing has capacity_status='open'
      update: { ...sample, capacity_status: "limited" },
    });
    await updateProgramStatus(ownerCtx, "p-1", { capacityStatus: "limited" }, supabase);
    expect(emitSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        signalType: "program.capacity_updated",
        orgId: "org-1",
        metadata: expect.objectContaining({
          previous_status: "open",
          new_status: "limited",
        }),
      }),
      expect.anything(),
    );
  });

  it("does NOT emit trust signal when capacity_status unchanged", async () => {
    const { emitSignal } = await import("@/lib/server/trustSignal");
    const supabase = client(); // existing.capacity_status === 'open', update payload returns same
    await updateProgramStatus(ownerCtx, "p-1", { acceptingReferrals: false }, supabase);
    expect(emitSignal).not.toHaveBeenCalled();
  });
});
