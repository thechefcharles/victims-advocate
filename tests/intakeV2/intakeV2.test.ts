/**
 * Domain 2.5 — intake-v2 conditional + service tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({}) as never,
}));
vi.mock("@/lib/server/cvcForms/cvcFormRepository", () => ({
  getActiveCvcFormTemplate: vi.fn().mockResolvedValue({ id: "tmpl-1", state_code: "IL" }),
}));

import { evaluateConditional } from "@/lib/server/intakeV2/conditional";
import {
  createIntakeV2Session,
  patchIntakeV2Session,
} from "@/lib/server/intakeV2/intakeV2Service";
import type { AuthContext } from "@/lib/server/auth";

const ownerCtx = {
  userId: "u-1",
  isAdmin: false,
  orgId: null,
  accountType: "applicant",
} as unknown as AuthContext;

const otherCtx = {
  userId: "u-other",
  isAdmin: false,
  orgId: null,
  accountType: "applicant",
} as unknown as AuthContext;

const baseSession = {
  id: "s-1",
  owner_user_id: "u-1",
  template_id: "tmpl-1",
  state_code: "IL",
  filer_type: "self_filing_adult",
  answers: { existing_field: "kept" },
  completed_sections: ["applicant"],
  current_section: "applicant",
  status: "draft",
  submitted_at: null,
  metadata: {},
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
};

function client(opts: { read?: unknown; write?: unknown } = {}) {
  const writeVal = "write" in opts ? opts.write : baseSession;
  const readVal = "read" in opts ? opts.read : baseSession;
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: writeVal, error: null }),
  };
  const insertChain = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: writeVal, error: null }),
  };
  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: readVal, error: null }),
  };
  return {
    from: vi.fn(() => ({
      insert: vi.fn(() => insertChain),
      update: vi.fn(() => updateChain),
      select: vi.fn(() => selectChain),
    })),
  } as never;
}

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// evaluateConditional
// ---------------------------------------------------------------------------

describe("evaluateConditional", () => {
  it("eq: matches", () => {
    expect(
      evaluateConditional(
        { field_key: "crime_type", operator: "eq", value: "homicide" },
        { crime_type: "homicide" },
      ),
    ).toBe(true);
  });
  it("eq: no match", () => {
    expect(
      evaluateConditional(
        { field_key: "crime_type", operator: "eq", value: "homicide" },
        { crime_type: "assault" },
      ),
    ).toBe(false);
  });
  it("neq matches", () => {
    expect(
      evaluateConditional(
        { field_key: "filer_type", operator: "neq", value: "minor" },
        { filer_type: "self_filing_adult" },
      ),
    ).toBe(true);
  });
  it("in matches", () => {
    expect(
      evaluateConditional(
        { field_key: "x", operator: "in", value: ["a", "b"] },
        { x: "b" },
      ),
    ).toBe(true);
  });
  it("not_in fails when present", () => {
    expect(
      evaluateConditional(
        { field_key: "x", operator: "not_in", value: ["a", "b"] },
        { x: "a" },
      ),
    ).toBe(false);
  });
  it("null rule = always shown", () => {
    expect(evaluateConditional(null, {})).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createIntakeV2Session
// ---------------------------------------------------------------------------

describe("createIntakeV2Session", () => {
  it("rejects malformed state code", async () => {
    await expect(
      createIntakeV2Session(
        ownerCtx,
        { stateCode: "Illinois", filerType: "self_filing_adult" },
        client(),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("rejects empty filerType", async () => {
    await expect(
      createIntakeV2Session(ownerCtx, { stateCode: "IL", filerType: "" }, client()),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("creates a session and resolves the active template", async () => {
    const session = await createIntakeV2Session(
      ownerCtx,
      { stateCode: "il", filerType: "self_filing_adult" },
      client(),
    );
    expect(session.id).toBe("s-1");
    expect(session.template_id).toBe("tmpl-1");
  });
});

// ---------------------------------------------------------------------------
// patchIntakeV2Session — merge semantics
// ---------------------------------------------------------------------------

describe("patchIntakeV2Session", () => {
  it("non-owner is forbidden", async () => {
    await expect(
      patchIntakeV2Session(otherCtx, "s-1", { answers: { x: 1 } }, client()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("merges new answers into existing answers (does not replace)", async () => {
    let captured: Record<string, unknown> | null = null;
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: baseSession, error: null }),
          })),
        })),
        update: vi.fn((patch: Record<string, unknown>) => {
          captured = patch;
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: { ...baseSession, answers: { ...baseSession.answers, new_field: "added" } }, error: null }),
              })),
            })),
          };
        }),
      })),
    } as never;
    const updated = await patchIntakeV2Session(
      ownerCtx,
      "s-1",
      { answers: { new_field: "added" } },
      supabase,
    );
    expect(captured!.answers).toEqual({ existing_field: "kept", new_field: "added" });
    expect(updated.answers.existing_field).toBe("kept");
    expect(updated.answers.new_field).toBe("added");
  });

  it("rejects edits to a submitted session", async () => {
    const supabase = client({ read: { ...baseSession, status: "submitted" } });
    await expect(
      patchIntakeV2Session(ownerCtx, "s-1", { answers: { x: 1 } }, supabase),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("union-merges completedSections (never shrinks)", async () => {
    let captured: Record<string, unknown> | null = null;
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: baseSession, error: null }),
          })),
        })),
        update: vi.fn((patch: Record<string, unknown>) => {
          captured = patch;
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: baseSession, error: null }),
              })),
            })),
          };
        }),
      })),
    } as never;
    await patchIntakeV2Session(
      ownerCtx,
      "s-1",
      { completedSections: ["victim"] },
      supabase,
    );
    expect(captured!.completed_sections).toEqual(
      expect.arrayContaining(["applicant", "victim"]),
    );
  });
});
