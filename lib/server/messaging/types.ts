export type ConversationStatus = "active" | "closed" | "archived";

export type CaseConversationRow = {
  id: string;
  created_at: string;
  updated_at: string;
  case_id: string;
  organization_id: string;
  created_by: string | null;
  status: ConversationStatus;
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

