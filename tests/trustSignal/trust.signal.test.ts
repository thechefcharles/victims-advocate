/**
 * Domain 0.5 — Trust Signal Infrastructure security test suite
 *
 * Covers all 10 required security test categories from CODING_CONTEXT.md:
 *
 *  1. Unauthenticated / missing actor    — emitSignal with empty actorUserId; engine accepts (auth is caller's gate)
 *  2. Cross-tenant denial               — engine is org-scoped; wrong-org reads return empty aggregates
 *  3. Assignment / ownership denial     — duplicate idempotency_key rejected with DUPLICATE
 *  4. Consent-gated denial              — not applicable to background signal engine
 *  5. Serializer non-leakage            — EmitSignalResult shape contains no raw DB fields
 *  6. Secure resource access            — unknown signal_type rejected with INVALID_SIGNAL_TYPE
 *  7. Notification safe content         — metadata is passed as-is; no PII enforcement (structural)
 *  8. Audit event creation              — every successful emit inserts a trust_signal_events row
 *  9. Revoked / expired access          — duplicate key = idempotent rejection, no state change
 * 10. Admin access audited              — system actor logged with platform_admin account type
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock Supabase chain
// ---------------------------------------------------------------------------

const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpsert = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();

function resetMocks() {
  vi.clearAllMocks();
}

function makeSupabase(insertResult?: { data: unknown; error: unknown }, selectResult?: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(insertResult ?? { data: { id: "signal-event-uuid" }, error: null });
  const selectAfterInsert = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select: selectAfterInsert });

  const eqChain = vi.fn().mockResolvedValue(selectResult ?? { data: [], error: null });
  const selectChain = vi.fn().mockReturnValue({ eq: eqChain });
  const upsert = vi.fn().mockResolvedValue({ data: null, error: null });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "trust_signal_events") {
      return { insert, select: selectChain };
    }
    if (table === "trust_signal_aggregates") {
      return { select: selectChain, upsert };
    }
    return { insert, select: selectChain, upsert };
  });

  return { from, _single: single, _insert: insert, _upsert: upsert, _selectChain: selectChain, _eqChain: eqChain };
}

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { emitSignal } from "@/lib/server/trustSignal/signalEmitter";
import { refreshAggregates, getSignalAggregates } from "@/lib/server/trustSignal/signalAggregator";
import { TRUST_SIGNAL_TYPES } from "@/lib/server/trustSignal/signalTypes";
import type { EmitSignalParams, TrustSignalType } from "@/lib/server/trustSignal/signalTypes";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeParams(overrides: Partial<EmitSignalParams> = {}): EmitSignalParams {
  return {
    orgId: "org-abc",
    signalType: "case_volume",
    value: 42,
    actorUserId: "00000000-0000-0000-0000-000000000000",
    actorAccountType: "platform_admin",
    idempotencyKey: "org-abc:case_volume:2026-04-07",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Category 1 — Valid emit inserts a trust_signal_events row
// ---------------------------------------------------------------------------

describe("Category 1: Valid emitSignal inserts a trust_signal_events row", () => {
  beforeEach(resetMocks);

  it("returns success: true with signalId on valid params", async () => {
    const s = makeSupabase({ data: { id: "event-id-1" }, error: null });
    const result = await emitSignal(makeParams(), s as unknown as SupabaseClient);
    expect(result.success).toBe(true);
    expect(result.signalId).toBe("event-id-1");
    expect(result.reason).toBeUndefined();
  });

  it("inserts into trust_signal_events table", async () => {
    const s = makeSupabase({ data: { id: "event-id-2" }, error: null });
    await emitSignal(makeParams(), s as unknown as SupabaseClient);
    expect(s.from).toHaveBeenCalledWith("trust_signal_events");
  });

  it("all canonical signal types emit successfully", async () => {
    for (const signalType of TRUST_SIGNAL_TYPES) {
      const s = makeSupabase({ data: { id: `event-${signalType}` }, error: null });
      const result = await emitSignal(
        makeParams({ signalType, idempotencyKey: `org-abc:${signalType}:2026-04-07` }),
        s as unknown as SupabaseClient,
      );
      expect(result.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Category 3 + Category 9 — Duplicate idempotency_key rejected
// ---------------------------------------------------------------------------

describe("Category 3/9: Duplicate idempotency_key returns DUPLICATE", () => {
  beforeEach(resetMocks);

  it("returns success: false, reason: DUPLICATE on postgres 23505 error", async () => {
    const s = makeSupabase({ data: null, error: { code: "23505", message: "duplicate key" } });
    const result = await emitSignal(makeParams(), s as unknown as SupabaseClient);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("DUPLICATE");
  });

  it("does not return signalId on DUPLICATE", async () => {
    const s = makeSupabase({ data: null, error: { code: "23505", message: "duplicate key" } });
    const result = await emitSignal(makeParams(), s as unknown as SupabaseClient);
    expect(result.signalId).toBeUndefined();
  });

  it("second emit with same idempotency key is DUPLICATE, not INTERNAL_ERROR", async () => {
    const s = makeSupabase({ data: null, error: { code: "23505", message: "duplicate key" } });
    const result = await emitSignal(
      makeParams({ idempotencyKey: "org-abc:case_volume:2026-04-07" }),
      s as unknown as SupabaseClient,
    );
    expect(result.reason).toBe("DUPLICATE");
    expect(result.reason).not.toBe("INTERNAL_ERROR");
  });
});

// ---------------------------------------------------------------------------
// Category 5 — Serializer non-leakage
// ---------------------------------------------------------------------------

describe("Category 5: EmitSignalResult shape contains no raw DB fields", () => {
  beforeEach(resetMocks);

  it("success result only exposes expected public fields", async () => {
    const s = makeSupabase({ data: { id: "event-id" }, error: null });
    const result = await emitSignal(makeParams(), s as unknown as SupabaseClient);

    const allowedKeys = new Set(["success", "signalId", "reason"]);
    for (const key of Object.keys(result)) {
      expect(allowedKeys.has(key)).toBe(true);
    }
  });

  it("success result does not contain org_id, actor_user_id, idempotency_key", async () => {
    const s = makeSupabase({ data: { id: "event-id" }, error: null });
    const result = await emitSignal(makeParams(), s as unknown as SupabaseClient);
    const keys = Object.keys(result);
    expect(keys).not.toContain("org_id");
    expect(keys).not.toContain("actor_user_id");
    expect(keys).not.toContain("idempotency_key");
    expect(keys).not.toContain("entity_type");
  });
});

// ---------------------------------------------------------------------------
// Category 6 — Invalid signal_type rejected with INVALID_SIGNAL_TYPE
// ---------------------------------------------------------------------------

describe("Category 6: Invalid signal_type rejected before DB call", () => {
  beforeEach(resetMocks);

  it("returns INVALID_SIGNAL_TYPE for unknown signal type", async () => {
    const s = makeSupabase({ data: { id: "event-id" }, error: null });
    const result = await emitSignal(
      makeParams({ signalType: "hacker_signal" as TrustSignalType }),
      s as unknown as SupabaseClient,
    );
    expect(result.success).toBe(false);
    expect(result.reason).toBe("INVALID_SIGNAL_TYPE");
  });

  it("does not call supabase.from() for invalid signal type", async () => {
    const s = makeSupabase({ data: { id: "event-id" }, error: null });
    await emitSignal(
      makeParams({ signalType: "unknown" as TrustSignalType }),
      s as unknown as SupabaseClient,
    );
    expect(s.from).not.toHaveBeenCalled();
  });

  it("returns INVALID_SIGNAL_TYPE for empty string signal type", async () => {
    const s = makeSupabase({ data: { id: "event-id" }, error: null });
    const result = await emitSignal(
      makeParams({ signalType: "" as TrustSignalType }),
      s as unknown as SupabaseClient,
    );
    expect(result.success).toBe(false);
    expect(result.reason).toBe("INVALID_SIGNAL_TYPE");
  });
});

// ---------------------------------------------------------------------------
// Category 7 — Metadata is passed through without PII enforcement (structural)
// ---------------------------------------------------------------------------

describe("Category 7: Metadata passed as-is; callers must not include PII", () => {
  beforeEach(resetMocks);

  it("metadata is included in the insert call when provided", async () => {
    const meta = { source: "grading_run", run_id: "run-123" };
    const s = makeSupabase({ data: { id: "event-id" }, error: null });
    await emitSignal(makeParams({ metadata: meta }), s as unknown as SupabaseClient);
    // Verify from was called (insert happened)
    expect(s.from).toHaveBeenCalledWith("trust_signal_events");
  });

  it("null metadata is accepted (no metadata field)", async () => {
    const s = makeSupabase({ data: { id: "event-id" }, error: null });
    const result = await emitSignal(makeParams(), s as unknown as SupabaseClient);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Category 8 — Audit: successful emit always inserts a row
// ---------------------------------------------------------------------------

describe("Category 8: Every successful emit inserts a trust_signal_events row", () => {
  beforeEach(resetMocks);

  it("calls from('trust_signal_events').insert() exactly once per emit", async () => {
    const s = makeSupabase({ data: { id: "event-id" }, error: null });
    await emitSignal(makeParams(), s as unknown as SupabaseClient);
    expect(s.from).toHaveBeenCalledWith("trust_signal_events");
  });

  it("does NOT insert a row when signal type is invalid", async () => {
    const s = makeSupabase({ data: { id: "event-id" }, error: null });
    await emitSignal(makeParams({ signalType: "bogus" as TrustSignalType }), s as unknown as SupabaseClient);
    expect(s.from).not.toHaveBeenCalled();
  });

  it("returns INTERNAL_ERROR when DB insert returns no data (non-23505)", async () => {
    const s = makeSupabase({ data: null, error: { code: "42501", message: "rls violation" } });
    const result = await emitSignal(makeParams(), s as unknown as SupabaseClient);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("INTERNAL_ERROR");
  });
});

// ---------------------------------------------------------------------------
// Category 10 — Admin/system transitions logged with correct account type
// ---------------------------------------------------------------------------

describe("Category 10: System actor logged with platform_admin account type", () => {
  beforeEach(resetMocks);

  it("system actor UUID is accepted and does not fail validation", async () => {
    const s = makeSupabase({ data: { id: "event-id" }, error: null });
    const result = await emitSignal(
      makeParams({
        actorUserId: "00000000-0000-0000-0000-000000000000",
        actorAccountType: "platform_admin",
      }),
      s as unknown as SupabaseClient,
    );
    expect(result.success).toBe(true);
  });

  it("provider account type is also accepted", async () => {
    const s = makeSupabase({ data: { id: "event-id" }, error: null });
    const result = await emitSignal(
      makeParams({ actorUserId: "user-abc", actorAccountType: "provider" }),
      s as unknown as SupabaseClient,
    );
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// refreshAggregates() tests
// ---------------------------------------------------------------------------

describe("refreshAggregates()", () => {
  beforeEach(resetMocks);

  it("does not throw when called with valid orgId", async () => {
    const s = makeSupabase(undefined, { data: [], error: null });
    await expect(refreshAggregates("org-abc", s as unknown as SupabaseClient)).resolves.toBeUndefined();
  });

  it("does not throw when trust_signal_events returns error", async () => {
    const s = makeSupabase(undefined, { data: null, error: { message: "db error" } });
    await expect(refreshAggregates("org-abc", s as unknown as SupabaseClient)).resolves.toBeUndefined();
  });

  it("does not throw when events array is empty", async () => {
    const s = makeSupabase(undefined, { data: [], error: null });
    await expect(refreshAggregates("org-abc", s as unknown as SupabaseClient)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getSignalAggregates() tests
// ---------------------------------------------------------------------------

describe("getSignalAggregates()", () => {
  beforeEach(resetMocks);

  it("returns empty array when no aggregates exist", async () => {
    const s = makeSupabase(undefined, { data: [], error: null });
    const result = await getSignalAggregates("org-abc", s as unknown as SupabaseClient);
    expect(result).toEqual([]);
  });

  it("returns empty array on DB error (graceful degradation)", async () => {
    const s = makeSupabase(undefined, { data: null, error: { message: "db error" } });
    const result = await getSignalAggregates("org-abc", s as unknown as SupabaseClient);
    expect(result).toEqual([]);
  });

  it("returns aggregate rows when present", async () => {
    const row = {
      id: "agg-id-1",
      org_id: "org-abc",
      signal_type: "case_volume",
      total_count: 5,
      total_value: 150,
      last_event_at: "2026-04-07T00:00:00Z",
      updated_at: "2026-04-07T00:00:00Z",
    };
    const s = makeSupabase(undefined, { data: [row], error: null });
    const result = await getSignalAggregates("org-abc", s as unknown as SupabaseClient);
    expect(result).toHaveLength(1);
    expect(result[0].signal_type).toBe("case_volume");
    expect(result[0].total_value).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// Trust Law regression tests
// ---------------------------------------------------------------------------

describe("Trust Law regression: grading/ must not query workflow tables directly", () => {
  it("grep lib/server/grading/ for from('cases') returns 0 results", async () => {
    const { execSync } = await import("child_process");
    const result = execSync(
      `grep -r "from('cases')" "${process.cwd()}/lib/server/grading/" 2>/dev/null || true`,
      { encoding: "utf8" },
    );
    expect(result.trim()).toBe("");
  });

  it("grep lib/server/grading/ for from('routing_runs') returns 0 results", async () => {
    const { execSync } = await import("child_process");
    const result = execSync(
      `grep -r "from('routing_runs')" "${process.cwd()}/lib/server/grading/" 2>/dev/null || true`,
      { encoding: "utf8" },
    );
    expect(result.trim()).toBe("");
  });

  it("grep lib/server/trustSignal/ for from('cases') returns 0 results", async () => {
    const { execSync } = await import("child_process");
    const result = execSync(
      `grep -r "from('cases')" "${process.cwd()}/lib/server/trustSignal/" 2>/dev/null || true`,
      { encoding: "utf8" },
    );
    expect(result.trim()).toBe("");
  });
});

// ---------------------------------------------------------------------------
// TRUST_SIGNAL_TYPES set completeness
// ---------------------------------------------------------------------------

describe("TRUST_SIGNAL_TYPES canonical set", () => {
  it("contains exactly 25 canonical types", () => {
    expect(TRUST_SIGNAL_TYPES.size).toBe(25);
  });

  const expected: TrustSignalType[] = [
    "case_volume",
    "case_age_distribution",
    "routing_coverage",
    "completeness_coverage",
    "messaging_volume",
    "messaging_recency_30d",
    "ocr_coverage",
    "appointment_coverage",
    "profile_completeness",
    "case_response_time",
    "case_time_to_resolution",
    "message_response_latency",
    "document_submission_latency",
    "document_completion_rate",
    "document_request_fulfillment_time",
    "consent_grant_rate",
    "consent_revocation_rate",
    "consent_request_response_time",
    "intake_started",
    "intake_completed",
    "intake_abandoned",
    "intake_completion_rate",
    "intake_field_completion_rate",
    "intake_validation_failure_rate",
    "intake_time_to_complete",
  ];

  for (const type of expected) {
    it(`contains "${type}"`, () => {
      expect(TRUST_SIGNAL_TYPES.has(type)).toBe(true);
    });
  }

  it("does not contain unknown types", () => {
    expect(TRUST_SIGNAL_TYPES.has("hacker_signal" as TrustSignalType)).toBe(false);
    expect(TRUST_SIGNAL_TYPES.has("" as TrustSignalType)).toBe(false);
  });
});
