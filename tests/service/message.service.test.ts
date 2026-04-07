/**
 * Domain 1.3 — Message service tests.
 *
 * Covers sendMessage and listMessages via the messageService.
 * Policy enforcement is validated at the service boundary (not re-testing policyEngine
 * internals — see message.policy.test.ts for those).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PolicyActor, PolicyResource } from "@/lib/server/policy/policyTypes";
import type { CaseConversationRow, CaseMessageRow } from "@/lib/server/messaging/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/notifications/triggers", () => ({
  notifyNewMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/data", () => ({
  appendCaseTimelineEvent: vi.fn().mockResolvedValue(undefined),
  getCaseById: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/server/trustSignal/signalEmitter", () => ({
  emitSignal: vi.fn().mockResolvedValue({ success: true, signalId: "sig-1" }),
}));

// ---------------------------------------------------------------------------
// Supabase mock helpers
// ---------------------------------------------------------------------------

function makeMessageRow(overrides: Partial<CaseMessageRow> = {}): CaseMessageRow {
  return {
    id: "msg-1",
    created_at: "2026-04-07T10:00:00Z",
    conversation_id: "thread-1",
    case_id: "case-1",
    organization_id: "org-123",
    sender_user_id: "user-actor",
    sender_role: "victim_advocate",
    message_text: "Hello",
    status: "sent",
    edited_at: null,
    deleted_at: null,
    metadata: {},
    ...overrides,
  };
}

function makeThread(overrides: Partial<CaseConversationRow> = {}): CaseConversationRow {
  return {
    id: "thread-1",
    created_at: "2026-04-07T09:00:00Z",
    updated_at: "2026-04-07T09:00:00Z",
    case_id: "case-1",
    organization_id: "org-123",
    created_by: "user-actor",
    status: "active",
    linked_object_type: "case",
    linked_object_id: "case-1",
    thread_type: "case",
    ...overrides,
  };
}

/** Creates a flexible chainable mock Supabase client. */
function makeSupabase(opts: {
  insertResult?: { data: unknown; error: unknown };
  queryResult?: { data: unknown; error: unknown };
  updateResult?: { data: unknown; error: unknown };
} = {}): SupabaseClient {
  const { insertResult, queryResult, updateResult } = opts;

  // Build a chainable query builder where every method returns `this`
  // except terminal ones (single, then-able) that resolve with the given result.
  function makeQueryBuilder(resolvedValue: { data: unknown; error: unknown }) {
    const builder: Record<string, unknown> = {};
    const self = () => builder;
    const terminalMethods = ["single", "maybeSingle"];
    const chainMethods = ["select", "eq", "neq", "lt", "lte", "gt", "gte", "in", "order", "limit", "not", "is", "filter"];
    for (const m of chainMethods) {
      builder[m] = vi.fn().mockReturnValue(builder);
    }
    for (const m of terminalMethods) {
      builder[m] = vi.fn().mockResolvedValue(resolvedValue);
    }
    // Make the builder itself thenable (for .then())
    builder["then"] = (resolve: (v: unknown) => unknown) => Promise.resolve(resolvedValue).then(resolve);
    return builder;
  }

  const insertQueryBuilder = makeQueryBuilder(insertResult ?? { data: makeMessageRow(), error: null });
  const selectQueryBuilder = makeQueryBuilder(queryResult ?? { data: [], error: null });
  const updateQueryBuilder = makeQueryBuilder(updateResult ?? { data: null, error: null });

  const from = vi.fn().mockImplementation((_table: string) => ({
    insert: vi.fn().mockReturnValue(insertQueryBuilder),
    select: vi.fn().mockReturnValue(selectQueryBuilder),
    update: vi.fn().mockReturnValue(updateQueryBuilder),
    upsert: vi.fn().mockReturnValue(updateQueryBuilder),
  }));

  return { from } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Actor / Resource helpers
// ---------------------------------------------------------------------------

function makeActor(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    userId: "user-actor",
    accountType: "provider",
    activeRole: "victim_advocate",
    tenantId: "org-123",
    tenantType: "provider",
    isAdmin: false,
    supportMode: false,
    safetyModeEnabled: false,
    ...overrides,
  };
}

function makeResource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "message",
    id: "thread-1",
    ownerId: "applicant-user",
    tenantId: "org-123",
    status: "active",
    assignedTo: "user-actor",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { sendMessage, listMessages } from "@/lib/server/messaging/messageService";
import { emitSignal } from "@/lib/server/trustSignal/signalEmitter";

// ---------------------------------------------------------------------------
// sendMessage tests
// ---------------------------------------------------------------------------

describe("sendMessage()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws FORBIDDEN when policy denies the send", async () => {
    const actor = makeActor({ activeRole: "victim_advocate", userId: "advocate-a" });
    const resource = makeResource({ assignedTo: "advocate-b" }); // not assigned
    const supabase = makeSupabase();
    await expect(
      sendMessage({
        actor,
        resource,
        conversation: makeThread(),
        messageText: "Hello",
        supabase,
      }),
    ).rejects.toThrow();
  });

  it("throws FORBIDDEN when thread is read_only", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const resource = makeResource({ status: "read_only" });
    const supabase = makeSupabase();
    await expect(
      sendMessage({
        actor,
        resource,
        conversation: makeThread(),
        messageText: "Hello",
        supabase,
      }),
    ).rejects.toThrow();
  });

  it("returns error when messageText is empty", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const resource = makeResource({ status: "active" });
    const supabase = makeSupabase();
    const result = await sendMessage({
      actor,
      resource,
      conversation: makeThread(),
      messageText: "   ",
      supabase,
    });
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("returns inserted message on success", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const resource = makeResource({ status: "active" });
    const msgRow = makeMessageRow({ id: "msg-success" });
    const supabase = makeSupabase({ insertResult: { data: msgRow, error: null } });
    const result = await sendMessage({
      actor,
      resource,
      conversation: makeThread(),
      messageText: "Test message",
      supabase,
    });
    expect(result.error).toBeNull();
    expect(result.data?.id).toBe("msg-success");
  });

  it("emits message_response_latency signal when provider replies to applicant", async () => {
    const actor = makeActor({ activeRole: "supervisor", accountType: "provider" });
    const resource = makeResource({ status: "active", ownerId: "applicant-user" });
    // Mock supabase to return a prior applicant message
    const priorMsg = { id: "prior-msg", created_at: "2026-04-07T09:00:00Z" };
    const supabase = makeSupabase({
      insertResult: { data: makeMessageRow(), error: null },
      queryResult: { data: [priorMsg], error: null },
    });
    vi.mocked(emitSignal).mockResolvedValueOnce({ success: true, signalId: "sig-lat" });
    await sendMessage({
      actor,
      resource,
      conversation: makeThread(),
      messageText: "Provider reply",
      supabase,
    });
    expect(vi.mocked(emitSignal)).toHaveBeenCalledWith(
      expect.objectContaining({ signalType: "message_response_latency" }),
      supabase,
    );
  });

  it("does not emit latency signal when applicant sends (not a provider)", async () => {
    const actor = makeActor({
      accountType: "applicant",
      activeRole: null,
      tenantId: null,
      tenantType: null,
      userId: "applicant-user",
    });
    const resource = makeResource({ status: "active", ownerId: "applicant-user", tenantId: null });
    const supabase = makeSupabase({ insertResult: { data: makeMessageRow(), error: null } });
    await sendMessage({
      actor,
      resource,
      conversation: makeThread(),
      messageText: "Applicant message",
      supabase,
    });
    expect(vi.mocked(emitSignal)).not.toHaveBeenCalled();
  });

  it("throws INTERNAL when DB insert fails", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const resource = makeResource({ status: "active" });
    const supabase = makeSupabase({
      insertResult: { data: null, error: { code: "42501", message: "rls" } },
    });
    await expect(
      sendMessage({
        actor,
        resource,
        conversation: makeThread(),
        messageText: "Test",
        supabase,
      }),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// listMessages tests
// ---------------------------------------------------------------------------

describe("listMessages()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws FORBIDDEN when policy denies read", async () => {
    const actor = makeActor({ activeRole: "victim_advocate", userId: "adv-a" });
    const resource = makeResource({ assignedTo: "adv-b" });
    const supabase = makeSupabase();
    await expect(
      listMessages({
        actor,
        resource,
        conversationId: "thread-1",
        supabase,
      }),
    ).rejects.toThrow();
  });

  it("returns empty page when no messages", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const resource = makeResource();
    const supabase = makeSupabase({ queryResult: { data: [], error: null } });
    const page = await listMessages({
      actor,
      resource,
      conversationId: "thread-1",
      supabase,
    });
    expect(page.data).toHaveLength(0);
    expect(page.meta.nextCursor).toBeNull();
  });

  it("returns messages sorted DESC", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const resource = makeResource();
    const msgs = [
      makeMessageRow({ id: "m3", created_at: "2026-04-07T12:00:00Z" }),
      makeMessageRow({ id: "m2", created_at: "2026-04-07T11:00:00Z" }),
      makeMessageRow({ id: "m1", created_at: "2026-04-07T10:00:00Z" }),
    ];
    const supabase = makeSupabase({ queryResult: { data: msgs, error: null } });
    const page = await listMessages({
      actor,
      resource,
      conversationId: "thread-1",
      supabase,
    });
    expect(page.data).toHaveLength(3);
    expect(page.data[0].id).toBe("m3");
  });

  it("returns nextCursor when there are more pages", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const resource = makeResource();
    // limit=2 but return 3 rows → hasMore = true
    const msgs = Array.from({ length: 3 }, (_, i) =>
      makeMessageRow({ id: `m${i}`, created_at: `2026-04-07T${10 + i}:00:00Z` }),
    );
    const supabase = makeSupabase({ queryResult: { data: msgs, error: null } });
    const page = await listMessages({
      actor,
      resource,
      conversationId: "thread-1",
      limit: 2,
      supabase,
    });
    expect(page.data).toHaveLength(2);
    expect(page.meta.nextCursor).not.toBeNull();
  });

  it("throws INTERNAL on DB error", async () => {
    const actor = makeActor({ activeRole: "supervisor" });
    const resource = makeResource();
    const supabase = makeSupabase({ queryResult: { data: null, error: { message: "db error" } } });
    await expect(
      listMessages({
        actor,
        resource,
        conversationId: "thread-1",
        supabase,
      }),
    ).rejects.toThrow();
  });
});
