/**
 * Domain 1.3 — Thread serializer.
 *
 * Three variants per the serializer boundary rule:
 *   serializeThreadForApplicant — applicant-safe view (no org internals)
 *   serializeThreadForProvider  — provider view
 *   serializeThreadForAdmin     — full view
 *
 * canSendMessage is derived by the caller from can("message:send") and
 * passed in — the serializer does not call can() internally.
 */

import type { ConversationStatus, CaseConversationRow } from "./types";

export interface ThreadApplicantView {
  id: string;
  status: ConversationStatus;
  canSendMessage: boolean;
  created_at: string;
  updated_at: string;
}

export interface ThreadProviderView extends ThreadApplicantView {
  organization_id: string;
  case_id: string;
  thread_type: string | null;
}

export interface ThreadAdminView extends ThreadProviderView {
  created_by: string | null;
  linked_object_type: string | null;
  linked_object_id: string | null;
}

export function serializeThreadForApplicant(
  thread: CaseConversationRow,
  canSendMessage: boolean,
): ThreadApplicantView {
  return {
    id: thread.id,
    status: thread.status,
    canSendMessage,
    created_at: thread.created_at,
    updated_at: thread.updated_at,
  };
}

export function serializeThreadForProvider(
  thread: CaseConversationRow,
  canSendMessage: boolean,
): ThreadProviderView {
  return {
    id: thread.id,
    status: thread.status,
    canSendMessage,
    created_at: thread.created_at,
    updated_at: thread.updated_at,
    organization_id: thread.organization_id,
    case_id: thread.case_id,
    thread_type: thread.thread_type,
  };
}

export function serializeThreadForAdmin(
  thread: CaseConversationRow,
  canSendMessage: boolean,
): ThreadAdminView {
  return {
    id: thread.id,
    status: thread.status,
    canSendMessage,
    created_at: thread.created_at,
    updated_at: thread.updated_at,
    organization_id: thread.organization_id,
    case_id: thread.case_id,
    thread_type: thread.thread_type,
    created_by: thread.created_by,
    linked_object_type: thread.linked_object_type,
    linked_object_id: thread.linked_object_id,
  };
}
