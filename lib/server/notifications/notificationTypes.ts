/**
 * Domain 7.2 — Notifications — canonical types (domain-pattern layer).
 *
 * Data class: A — Restricted (user-scoped, no cross-user leakage).
 *
 * Extends the existing types.ts with domain-pattern enums and interfaces.
 * The legacy types.ts continues to exist for back-compat; new code should
 * import from this file.
 *
 * Critical rules:
 *   1. Every query MUST filter by recipient_user_id = auth.uid()
 *   2. body must be plain language — never raw case/message/document content
 *   3. Creating notification is SYNCHRONOUS; delivery is ASYNC fire-and-forget
 *   4. Notifications do NOT change workflow state — side effects only
 */

export type { NotificationRow, NotificationPreferencesRow, NotificationChannel, NotificationStatus } from "./types";

// ---------------------------------------------------------------------------
// Notification categories
// ---------------------------------------------------------------------------

export const NOTIFICATION_CATEGORIES = [
  "case_update",
  "support_request_update",
  "message_received",
  "document_update",
  "appointment_reminder",
  "intake_update",
  "reporting_update",
  "trust_update",
  "policy_acceptance",
  "system",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Delivery status (for future delivery tracking)
// ---------------------------------------------------------------------------

export const NOTIFICATION_DELIVERY_STATUSES = [
  "pending",
  "sent",
  "failed",
] as const;

export type NotificationDeliveryStatus =
  (typeof NOTIFICATION_DELIVERY_STATUSES)[number];

// ---------------------------------------------------------------------------
// Create notification input — domain-pattern shape
// ---------------------------------------------------------------------------

export interface CreateNotificationInput {
  recipientUserId: string;
  category: NotificationCategory;
  linkedObjectType: string;
  linkedObjectId: string;
  title: string;
  /** Must be plain language. NEVER raw case/message/document content. */
  body: string;
  organizationId?: string;
  caseId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Serialized views
// ---------------------------------------------------------------------------

export interface NotificationView {
  id: string;
  category: string;
  title: string;
  body: string | null;
  status: string;
  linkedObjectType: string | null;
  linkedObjectId: string | null;
  actionUrl: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPreferenceView {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  muteSensitivePreviews: boolean;
  categoryOverrides: Record<string, unknown>;
}
