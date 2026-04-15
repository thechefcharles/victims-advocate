/**
 * Domain 2.2 — verifyStateConfig service tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => ({}) as never,
}));

import { verifyStateConfig } from "@/lib/server/stateConfig/verifyStateConfig";
import { AppError } from "@/lib/server/api";
import type { AuthContext } from "@/lib/server/auth";

const adminCtx = { userId: "u-admin", isAdmin: true, orgId: null } as unknown as AuthContext;
const nonAdminCtx = { userId: "u-other", isAdmin: false, orgId: null } as unknown as AuthContext;

function client(rows: unknown[], updateError: { message: string } | null = null) {
  const updateChain = {
    eq: vi.fn().mockResolvedValue({ data: null, error: updateError }),
  };
  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => selectChain),
      update: vi.fn(() => updateChain),
    })),
  } as never;
}

beforeEach(() => vi.clearAllMocks());

describe("verifyStateConfig", () => {
  it("non-admin is forbidden", async () => {
    await expect(
      verifyStateConfig(nonAdminCtx, "CA", "Confirmed against CalVCB site.", client([])),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects malformed state code", async () => {
    await expect(
      verifyStateConfig(adminCtx, "California", "notes", client([])),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("requires non-empty verificationNotes", async () => {
    await expect(
      verifyStateConfig(adminCtx, "CA", "   ", client([])),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("404 when no row exists for state code", async () => {
    await expect(
      verifyStateConfig(adminCtx, "ZZ", "notes", client([])),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("prefers active row over draft when both exist", async () => {
    const supabase = client([
      { id: "draft-1", state_code: "CA", status: "draft", human_verified: false },
      { id: "active-1", state_code: "CA", status: "active", human_verified: false },
    ]);
    const result = await verifyStateConfig(adminCtx, "ca", "Verified against statute.", supabase);
    expect(result.id).toBe("active-1");
    expect(result.humanVerified).toBe(true);
    expect(result.verifiedBy).toBe("u-admin");
  });
});
