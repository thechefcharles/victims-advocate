/**
 * Domain 1.3 — Messaging: canonical DB row types.
 *
 * ConversationStatus aliases MessageThreadStatus from the registry.
 * "closed" was renamed to "read_only" in migration 20260503000000_messaging_thread_v2.sql.
 *
 * CaseConversationRow now includes Option C additive columns:
 *   linked_object_type, linked_object_id, thread_type
 */

import type { MessageThreadStatus } from "@nxtstps/registry";

/** Alias for MessageThreadStatus — "active" | "read_only" | "archived". */
export type ConversationStatus = MessageThreadStatus;

export type CaseConversationRow = {
  id: string;
  created_at: string;
  updated_at: string;
  case_id: string;
  organization_id: string;
  created_by: string | null;
  status: ConversationStatus;
  /** Domain 1.3 Option C — always "case" for case threads. */
  linked_object_type: string | null;
  /** Domain 1.3 Option C — mirrors case_id for case threads. */
  linked_object_id: string | null;
  /** Domain 1.3 — "case" for standard threads, "workflow" for workflow-bound threads. */
  thread_type: string | null;
};

export type MessageStatus = "sent" | "edited" | "deleted";

export type CaseMessageRow = {
  id: string;
  created_at: string;
  conversation_id: string;
  case_id: string;
  organization_id: string;
  sender_user_id: string;
  sender_role: string | null;
  message_text: string;
  status: MessageStatus;
  edited_at: string | null;
  deleted_at: string | null;
  metadata: Record<string, unknown>;
};
