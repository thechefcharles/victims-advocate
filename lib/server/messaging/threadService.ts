/**
 * Domain 1.3 — Thread service.
 *
 * Provides thread-level CRUD operations that are isolated from message-level
 * operations. All functions accept a SupabaseClient rather than an AuthContext
 * to keep the service layer testable without the auth stack.
 *
 * Thread status transitions are handled here; the policy engine is invoked
 * by callers (routes) before calling these functions.
 *
 * getOrCreateCaseThread: lazy create on first GET, only when SR is accepted.
 * resolveThreadParticipants: returns [caseOwnerId, ...orgMemberIds] without a DB query.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { emitSignal } from "@/lib/server/trustSignal";
import type { CaseConversationRow } from "./types";

// ---------------------------------------------------------------------------
// getThread
// ---------------------------------------------------------------------------

/** Fetch a thread by primary key. Returns null if not found. */
export async function getThread(
  threadId: string,
  supabase: SupabaseClient,
): Promise<CaseConversationRow | null> {
  const { data, error } = await supabase
    .from("case_conversations")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();

  if (error) throw new AppError("INTERNAL", "Failed to load thread", undefined, 500);
  return data as CaseConversationRow | null;
}

// ---------------------------------------------------------------------------
// getOrCreateCaseThread
// ---------------------------------------------------------------------------

/**
 * Lazy-creates a case thread on first access.
 * Callers must verify the parent case status before calling (Domain 1.3 Decision 6).
 */
export async function getOrCreateCaseThread(params: {
  caseId: string;
  orgId: string;
  userId: string;
  supabase: SupabaseClient;
}): Promise<CaseConversationRow> {
  const { caseId, orgId, userId, supabase } = params;

  const { data: existing, error: selErr } = await supabase
    .from("case_conversations")
    .select("*")
    .eq("case_id", caseId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (selErr) throw new AppError("INTERNAL", "Failed to load thread", undefined, 500);
  if (existing) return existing as CaseConversationRow;

  const { data: inserted, error: insErr } = await supabase
    .from("case_conversations")
    .insert({
      case_id: caseId,
      organization_id: orgId,
      created_by: userId,
      status: "active",
      linked_object_type: "case",
      linked_object_id: caseId,
      thread_type: "case",
    })
    .select("*")
    .single();

  if (insErr || !inserted) {
    throw new AppError("INTERNAL", "Failed to create thread", undefined, 500);
  }
  return inserted as CaseConversationRow;
}

// ---------------------------------------------------------------------------
// createWorkflowThread
// ---------------------------------------------------------------------------

/** Create a workflow-bound thread. CASE_LEADERSHIP only — caller enforces policy. */
export async function createWorkflowThread(params: {
  caseId: string;
  orgId: string;
  userId: string;
  supabase: SupabaseClient;
}): Promise<CaseConversationRow> {
  const { caseId, orgId, userId, supabase } = params;

  const { data, error } = await supabase
    .from("case_conversations")
    .insert({
      case_id: caseId,
      organization_id: orgId,
      created_by: userId,
      status: "active",
      linked_object_type: "case",
      linked_object_id: caseId,
      thread_type: "workflow",
    })
    .select("*")
    .single();

  if (error || !data) throw new AppError("INTERNAL", "Failed to create workflow thread", undefined, 500);
  return data as CaseConversationRow;
}

// ---------------------------------------------------------------------------
// archiveThread
// ---------------------------------------------------------------------------

/** Transition a thread to "archived". Caller must enforce policy before calling. */
export async function archiveThread(params: {
  threadId: string;
  supabase: SupabaseClient;
  actorUserId?: string;
  actorAccountType?: string;
}): Promise<void> {
  const { threadId, supabase, actorUserId, actorAccountType } = params;

  // Fetch the thread first so we have the org id for signal emission.
  const { data: thread, error: loadErr } = await supabase
    .from("case_conversations")
    .select("id, organization_id, case_id")
    .eq("id", threadId)
    .maybeSingle();
  if (loadErr) throw new AppError("INTERNAL", "Failed to load thread", undefined, 500);

  const { error } = await supabase
    .from("case_conversations")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", threadId);

  if (error) throw new AppError("INTERNAL", "Failed to archive thread", undefined, 500);

  // message_response_rate + thread_participation_rate are emitted as lifecycle
  // markers on archive; Phase 6 aggregates compute the actual ratios from the
  // raw message history. Emission is best-effort — fire-and-forget.
  const row = thread as { organization_id?: string | null; case_id?: string | null } | null;
  if (row?.organization_id && actorUserId && actorAccountType) {
    void emitSignal(
      {
        orgId: row.organization_id,
        signalType: "message_response_rate",
        value: 0,
        actorUserId,
        actorAccountType,
        idempotencyKey: `${row.organization_id}:message_response_rate:${threadId}`,
        metadata: { thread_id: threadId, case_id: row.case_id ?? null },
      },
      supabase,
    );
    void emitSignal(
      {
        orgId: row.organization_id,
        signalType: "thread_participation_rate",
        value: 0,
        actorUserId,
        actorAccountType,
        idempotencyKey: `${row.organization_id}:thread_participation_rate:${threadId}`,
        metadata: { thread_id: threadId, case_id: row.case_id ?? null },
      },
      supabase,
    );
  }
}

// ---------------------------------------------------------------------------
// setThreadReadOnly
// ---------------------------------------------------------------------------

/** Transition a thread to "read_only". Caller must enforce policy before calling. */
export async function setThreadReadOnly(params: {
  threadId: string;
  supabase: SupabaseClient;
}): Promise<void> {
  const { threadId, supabase } = params;
  const { error } = await supabase
    .from("case_conversations")
    .update({ status: "read_only", updated_at: new Date().toISOString() })
    .eq("id", threadId);

  if (error) throw new AppError("INTERNAL", "Failed to set thread read-only", undefined, 500);
}

// ---------------------------------------------------------------------------
// resolveThreadParticipants
// ---------------------------------------------------------------------------

/**
 * Returns participant user IDs for a thread.
 * Participants = case owner + (when orgId provided) all org staff.
 * This is a structural calculation — no DB query. Callers may enrich
 * with DB-loaded org member IDs if needed.
 */
export function resolveThreadParticipants(params: {
  caseOwnerId: string;
  orgMemberIds?: string[];
}): string[] {
  const { caseOwnerId, orgMemberIds = [] } = params;
  const set = new Set([caseOwnerId, ...orgMemberIds]);
  return Array.from(set);
}
