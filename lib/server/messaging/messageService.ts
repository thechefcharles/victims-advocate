/**
 * Domain 1.3 — Message service (Domain 1.3 rewrite).
 *
 * All authorization is via can() from policyEngine — no inline role checks.
 * Callers must build a PolicyActor (via buildActor) and a PolicyResource before
 * calling sendMessage or listMessages.
 *
 * sendMessage emits the message_response_latency trust signal when a provider
 * replies to the most recent applicant message (Decision 10).
 *
 * listMessages uses cursor-based pagination: sorted created_at DESC, default 50.
 * Cursor encodes { created_at, id } as base64 JSON.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import { can } from "@/lib/server/policy/policyEngine";
import { emitSignal } from "@/lib/server/trustSignal/signalEmitter";
import { appendCaseTimelineEvent } from "@/lib/server/data";
import { logEvent } from "@/lib/server/audit/logEvent";
import { notifyNewMessage } from "@/lib/server/notifications/triggers";
import type { PolicyActor, PolicyResource, PolicyContext } from "@/lib/server/policy/policyTypes";
import type { CaseConversationRow, CaseMessageRow } from "./types";

const DEFAULT_PAGE_SIZE = 50;

function truncatePreview(text: string, max = 160): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max) + "…";
}

// ---------------------------------------------------------------------------
// Cursor helpers
// ---------------------------------------------------------------------------

interface CursorPayload {
  created_at: string;
  id: string;
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as CursorPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// sendMessage
// ---------------------------------------------------------------------------

export interface SendMessageParams {
  actor: PolicyActor;
  resource: PolicyResource;
  context?: PolicyContext;
  conversation: CaseConversationRow;
  messageText: string;
  supabase: SupabaseClient;
  /** Optional ctx for timeline/notification side-effects (legacy compat). */
  legacyCtx?: { userId: string; role: string; isAdmin: boolean; orgId: string | null };
}

export interface SendMessageResult {
  data: CaseMessageRow | null;
  error: string | null;
}

export async function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
  const { actor, resource, context, conversation, messageText, supabase, legacyCtx } = params;

  const text = messageText.trim();
  if (!text) {
    return { data: null, error: "Message text is required." };
  }

  // Policy gate — resource.status must be pre-set to the effective thread status
  const decision = await can("message:send", actor, resource, context);
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "You do not have permission to send messages here.", undefined, 403);
  }

  const { data: inserted, error: insErr } = await supabase
    .from("case_messages")
    .insert({
      conversation_id: conversation.id,
      case_id: conversation.case_id,
      organization_id: conversation.organization_id,
      sender_user_id: actor.userId,
      sender_role: actor.activeRole ?? legacyCtx?.role ?? null,
      message_text: text,
      status: "sent",
      metadata: {},
    })
    .select("*")
    .single();

  if (insErr || !inserted) {
    throw new AppError("INTERNAL", "Failed to send message", undefined, 500);
  }

  // Update conversation updated_at
  await supabase
    .from("case_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);

  const msg = inserted as CaseMessageRow;

  // Trust signal: message_response_latency — when provider replies to an applicant message
  if (actor.accountType === "provider" && resource.ownerId) {
    const { data: lastApplicantMsgs } = await supabase
      .from("case_messages")
      .select("id, created_at")
      .eq("conversation_id", conversation.id)
      .eq("sender_user_id", resource.ownerId)
      .neq("status", "deleted")
      .order("created_at", { ascending: false })
      .limit(1);

    const lastApplicantMsg = (lastApplicantMsgs ?? [])[0] as { id: string; created_at: string } | undefined;
    if (lastApplicantMsg) {
      const latencyHours =
        (new Date(msg.created_at).getTime() - new Date(lastApplicantMsg.created_at).getTime()) /
        (1000 * 60 * 60);
      const idempKey = `${conversation.organization_id}:message_response_latency:${lastApplicantMsg.id}`;
      await emitSignal(
        {
          orgId: conversation.organization_id,
          signalType: "message_response_latency",
          value: Math.max(0, latencyHours),
          actorUserId: actor.userId,
          actorAccountType: actor.accountType,
          idempotencyKey: idempKey,
        },
        supabase,
      );
    }
  }

  // Side effects — fire-and-forget, graceful degradation
  if (legacyCtx) {
    try {
      await appendCaseTimelineEvent({
        caseId: conversation.case_id,
        organizationId: conversation.organization_id,
        actor: { userId: legacyCtx.userId, role: legacyCtx.role },
        eventType: "case.message_sent",
        title: "Secure message sent",
        description: null,
        metadata: {
          sender_role: actor.activeRole ?? legacyCtx.role,
          message_preview: truncatePreview(text),
        },
      });
    } catch {
      // non-fatal
    }

    try {
      await logEvent({
        ctx: legacyCtx as Parameters<typeof logEvent>[0]["ctx"],
        action: "message.sent",
        resourceType: "case_message",
        resourceId: msg.id,
        organizationId: conversation.organization_id,
        metadata: { caseId: conversation.case_id },
      });
    } catch {
      // non-fatal
    }

    try {
      await notifyNewMessage({
        caseId: conversation.case_id,
        organizationId: conversation.organization_id,
        senderId: actor.userId,
        senderRole: actor.accountType === "provider" ? "advocate" : "victim",
        ctx: legacyCtx as Parameters<typeof notifyNewMessage>[0]["ctx"],
      });
    } catch {
      // non-fatal
    }
  }

  return { data: msg, error: null };
}

// ---------------------------------------------------------------------------
// listMessages
// ---------------------------------------------------------------------------

export interface ListMessagesParams {
  actor: PolicyActor;
  resource: PolicyResource;
  context?: PolicyContext;
  conversationId: string;
  cursor?: string | null;
  limit?: number;
  supabase: SupabaseClient;
}

export interface MessagePage {
  data: CaseMessageRow[];
  meta: {
    nextCursor: string | null;
    prevCursor: string | null;
  };
}

export async function listMessages(params: ListMessagesParams): Promise<MessagePage> {
  const { actor, resource, context, conversationId, cursor, supabase } = params;
  const limit = Math.min(params.limit ?? DEFAULT_PAGE_SIZE, 100);

  // Policy gate
  const decision = await can("message:read", actor, resource, context);
  if (!decision.allowed) {
    throw new AppError("FORBIDDEN", decision.message ?? "Access denied.", undefined, 403);
  }

  let query = supabase
    .from("case_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1); // fetch one extra to detect next page

  if (cursor) {
    const payload = decodeCursor(cursor);
    if (payload) {
      // created_at < cursor.created_at OR (created_at == cursor.created_at AND id < cursor.id)
      query = query.lt("created_at", payload.created_at);
    }
  }

  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL", "Failed to list messages", undefined, 500);

  const rows = (data ?? []) as CaseMessageRow[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor({ created_at: page[page.length - 1].created_at, id: page[page.length - 1].id })
      : null;

  return {
    data: page,
    meta: {
      nextCursor,
      prevCursor: null, // forward-only pagination for this domain
    },
  };
}
