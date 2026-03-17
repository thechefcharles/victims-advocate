import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { AppError } from "@/lib/server/api";
import { appendCaseTimelineEvent } from "@/lib/server/data";
import { logEvent } from "@/lib/server/audit/logEvent";
import { notifyNewMessage } from "@/lib/server/notifications/triggers";
import type { CaseConversationRow, CaseMessageRow } from "./types";

function truncatePreview(text: string, max = 160): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max) + "…";
}

export async function listMessages(params: {
  conversationId: string;
  ctx: AuthContext;
}): Promise<CaseMessageRow[]> {
  const { conversationId } = params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("case_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw new AppError("INTERNAL", "Failed to list messages", undefined, 500);
  return (data ?? []) as CaseMessageRow[];
}

export async function sendMessage(params: {
  conversation: CaseConversationRow;
  ctx: AuthContext;
  message_text: string;
}): Promise<CaseMessageRow> {
  const { conversation, ctx } = params;
  const messageText = (params.message_text ?? "").trim();
  if (!messageText) {
    throw new AppError("VALIDATION_ERROR", "Message text is required", undefined, 400);
  }

  const supabase = getSupabaseAdmin();

  const { data: inserted, error } = await supabase
    .from("case_messages")
    .insert({
      conversation_id: conversation.id,
      case_id: conversation.case_id,
      organization_id: conversation.organization_id,
      sender_user_id: ctx.userId,
      sender_role: ctx.role,
      message_text: messageText,
      status: "sent",
      metadata: {},
    })
    .select("*")
    .single();

  if (error || !inserted) throw new AppError("INTERNAL", "Failed to send message", undefined, 500);

  await supabase
    .from("case_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id)
    .eq("organization_id", conversation.organization_id);

  const msg = inserted as CaseMessageRow;

  await appendCaseTimelineEvent({
    caseId: conversation.case_id,
    organizationId: conversation.organization_id,
    actor: { userId: ctx.userId, role: ctx.role },
    eventType: "case.message_sent",
    title: "Secure message sent",
    description: null,
    metadata: {
      sender_role: ctx.role,
      message_preview: truncatePreview(messageText),
    },
  });

  await logEvent({
    ctx,
    action: "message.sent",
    resourceType: "case_message",
    resourceId: msg.id,
    organizationId: conversation.organization_id,
    metadata: { caseId: conversation.case_id },
  });

  await notifyNewMessage({
    caseId: conversation.case_id,
    organizationId: conversation.organization_id,
    senderId: ctx.userId,
    senderRole: ctx.role === "advocate" ? "advocate" : "victim",
    ctx,
  });

  return msg;
}

export async function markMessageRead(params: {
  messageId: string;
  ctx: AuthContext;
}): Promise<void> {
  const { messageId, ctx } = params;
  const supabase = getSupabaseAdmin();

  const { data: msg, error: msgErr } = await supabase
    .from("case_messages")
    .select("id")
    .eq("id", messageId)
    .maybeSingle();

  if (msgErr || !msg) return;

  const { error } = await supabase.from("message_reads").upsert(
    {
      message_id: messageId,
      user_id: ctx.userId,
      read_at: new Date().toISOString(),
    },
    { onConflict: "message_id,user_id" }
  );
  if (error) throw new AppError("INTERNAL", "Failed to mark message read", undefined, 500);
}

export async function softDeleteMessage(params: {
  messageId: string;
  ctx: AuthContext;
}): Promise<void> {
  const { messageId, ctx } = params;
  const supabase = getSupabaseAdmin();

  const { data: msg, error: msgErr } = await supabase
    .from("case_messages")
    .select("id, sender_user_id, case_id, organization_id")
    .eq("id", messageId)
    .maybeSingle();

  if (msgErr || !msg) return;

  const isSender = (msg as any).sender_user_id === ctx.userId;
  const canModerate = ctx.isAdmin || ctx.orgRole === "org_admin" || ctx.orgRole === "supervisor";
  if (!isSender && !canModerate) {
    throw new AppError("FORBIDDEN", "Not allowed to delete this message", undefined, 403);
  }

  const { error } = await supabase
    .from("case_messages")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
      message_text: "",
    })
    .eq("id", messageId);

  if (error) throw new AppError("INTERNAL", "Failed to delete message", undefined, 500);

  await logEvent({
    ctx,
    action: "message.deleted",
    resourceType: "case_message",
    resourceId: messageId,
    organizationId: (msg as any).organization_id,
    metadata: { caseId: (msg as any).case_id },
  });
}

