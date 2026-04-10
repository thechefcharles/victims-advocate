/**
 * Domain 7.3 — AI Guidance repository.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/server/api";
import type {
  AdvocateCopilotDraft,
  AdvocateCopilotDraftStatus,
  AIGuidanceLog,
  AIGuidanceLogEventType,
  AIGuidanceMessage,
  AIGuidanceSession,
  AIGuidanceSessionStatus,
  AIGuidanceSurfaceType,
} from "./aiGuidanceTypes";

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function rowToSession(row: Record<string, unknown>): AIGuidanceSession {
  return {
    id: String(row.id),
    actorUserId: String(row.actor_user_id),
    actorAccountType: String(row.actor_account_type),
    surfaceType: row.surface_type as AIGuidanceSurfaceType,
    linkedObjectType: row.linked_object_type != null ? String(row.linked_object_type) : null,
    linkedObjectId: row.linked_object_id != null ? String(row.linked_object_id) : null,
    status: row.status as AIGuidanceSessionStatus,
    language: String(row.language ?? "en"),
    escalationReason: row.escalation_reason != null ? String(row.escalation_reason) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToMessage(row: Record<string, unknown>): AIGuidanceMessage {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    actorType: row.actor_type as AIGuidanceMessage["actorType"],
    content: String(row.content),
    contentType: row.content_type as AIGuidanceMessage["contentType"],
    disclaimerFlags: Array.isArray(row.disclaimer_flags) ? (row.disclaimer_flags as string[]) : [],
    createdAt: String(row.created_at),
  };
}

function rowToLog(row: Record<string, unknown>): AIGuidanceLog {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    actorId: String(row.actor_id),
    eventType: row.event_type as AIGuidanceLogEventType,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
  };
}

function rowToDraft(row: Record<string, unknown>): AdvocateCopilotDraft {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    organizationId: String(row.organization_id),
    generatedByUserId: String(row.generated_by_user_id),
    draftType: row.draft_type as AdvocateCopilotDraft["draftType"],
    draftContent: String(row.draft_content),
    humanReviewRequired: Boolean(row.human_review_required),
    status: row.status as AdvocateCopilotDraftStatus,
    reviewedByUserId: row.reviewed_by_user_id != null ? String(row.reviewed_by_user_id) : null,
    reviewedAt: row.reviewed_at != null ? String(row.reviewed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function insertSession(
  fields: Omit<AIGuidanceSession, "id" | "createdAt" | "updatedAt" | "escalationReason"> & { escalationReason?: string },
  supabase: SupabaseClient,
): Promise<AIGuidanceSession> {
  const { data, error } = await supabase
    .from("ai_guidance_sessions")
    .insert({
      actor_user_id: fields.actorUserId,
      actor_account_type: fields.actorAccountType,
      surface_type: fields.surfaceType,
      linked_object_type: fields.linkedObjectType,
      linked_object_id: fields.linkedObjectId,
      status: fields.status,
      language: fields.language,
    })
    .select("*")
    .single();
  if (error || !data) throw new AppError("INTERNAL", `Failed to create session: ${error?.message ?? "no data"}`);
  return rowToSession(data as Record<string, unknown>);
}

export async function getSessionById(id: string, supabase: SupabaseClient): Promise<AIGuidanceSession | null> {
  const { data, error } = await supabase.from("ai_guidance_sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw new AppError("INTERNAL", `Failed to read session: ${error.message}`);
  return data ? rowToSession(data as Record<string, unknown>) : null;
}

export async function updateSessionStatus(
  id: string,
  status: AIGuidanceSessionStatus,
  fields?: { escalationReason?: string },
  supabase?: SupabaseClient,
): Promise<AIGuidanceSession> {
  const sb = supabase!;
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (fields?.escalationReason) updates.escalation_reason = fields.escalationReason;
  const { data, error } = await sb.from("ai_guidance_sessions").update(updates).eq("id", id).select("*").single();
  if (error || !data) throw new AppError("INTERNAL", `Failed to update session: ${error?.message ?? "no data"}`);
  return rowToSession(data as Record<string, unknown>);
}

export async function listSessionsForUser(userId: string, supabase: SupabaseClient): Promise<AIGuidanceSession[]> {
  const { data, error } = await supabase.from("ai_guidance_sessions").select("*").eq("actor_user_id", userId).order("created_at", { ascending: false }).limit(20);
  if (error) throw new AppError("INTERNAL", `Failed to list sessions: ${error.message}`);
  return (data ?? []).map((r) => rowToSession(r as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function insertMessage(
  fields: Omit<AIGuidanceMessage, "id" | "createdAt">,
  supabase: SupabaseClient,
): Promise<AIGuidanceMessage> {
  const { data, error } = await supabase
    .from("ai_guidance_messages")
    .insert({
      session_id: fields.sessionId,
      actor_type: fields.actorType,
      content: fields.content,
      content_type: fields.contentType,
      disclaimer_flags: fields.disclaimerFlags,
    })
    .select("*")
    .single();
  if (error || !data) throw new AppError("INTERNAL", `Failed to create message: ${error?.message ?? "no data"}`);
  return rowToMessage(data as Record<string, unknown>);
}

export async function listMessagesForSession(sessionId: string, supabase: SupabaseClient): Promise<AIGuidanceMessage[]> {
  const { data, error } = await supabase.from("ai_guidance_messages").select("*").eq("session_id", sessionId).order("created_at", { ascending: true });
  if (error) throw new AppError("INTERNAL", `Failed to list messages: ${error.message}`);
  return (data ?? []).map((r) => rowToMessage(r as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Logs — INSERT ONLY
// ---------------------------------------------------------------------------

export async function insertLog(
  fields: Omit<AIGuidanceLog, "id" | "createdAt">,
  supabase: SupabaseClient,
): Promise<AIGuidanceLog> {
  const { data, error } = await supabase
    .from("ai_guidance_logs")
    .insert({
      session_id: fields.sessionId,
      actor_id: fields.actorId,
      event_type: fields.eventType,
      metadata: fields.metadata,
    })
    .select("*")
    .single();
  if (error || !data) throw new AppError("INTERNAL", `Failed to create log: ${error?.message ?? "no data"}`);
  return rowToLog(data as Record<string, unknown>);
}

export async function listLogsForSession(sessionId: string, supabase: SupabaseClient): Promise<AIGuidanceLog[]> {
  const { data, error } = await supabase.from("ai_guidance_logs").select("*").eq("session_id", sessionId).order("created_at", { ascending: true });
  if (error) throw new AppError("INTERNAL", `Failed to list logs: ${error.message}`);
  return (data ?? []).map((r) => rowToLog(r as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Copilot drafts
// ---------------------------------------------------------------------------

export async function insertDraft(
  fields: Omit<AdvocateCopilotDraft, "id" | "createdAt" | "updatedAt" | "reviewedByUserId" | "reviewedAt">,
  supabase: SupabaseClient,
): Promise<AdvocateCopilotDraft> {
  const { data, error } = await supabase
    .from("advocate_copilot_drafts")
    .insert({
      session_id: fields.sessionId,
      organization_id: fields.organizationId,
      generated_by_user_id: fields.generatedByUserId,
      draft_type: fields.draftType,
      draft_content: fields.draftContent,
      human_review_required: true, // ALWAYS true in v1
      status: "draft_generated",
    })
    .select("*")
    .single();
  if (error || !data) throw new AppError("INTERNAL", `Failed to create draft: ${error?.message ?? "no data"}`);
  return rowToDraft(data as Record<string, unknown>);
}

export async function updateDraftStatus(
  id: string,
  status: AdvocateCopilotDraftStatus,
  reviewedByUserId?: string,
  supabase?: SupabaseClient,
): Promise<AdvocateCopilotDraft> {
  const sb = supabase!;
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (reviewedByUserId) {
    updates.reviewed_by_user_id = reviewedByUserId;
    updates.reviewed_at = new Date().toISOString();
  }
  const { data, error } = await sb.from("advocate_copilot_drafts").update(updates).eq("id", id).select("*").single();
  if (error || !data) throw new AppError("INTERNAL", `Failed to update draft: ${error?.message ?? "no data"}`);
  return rowToDraft(data as Record<string, unknown>);
}
