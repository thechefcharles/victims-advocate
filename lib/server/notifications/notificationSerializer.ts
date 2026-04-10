/**
 * Domain 7.2 — Notification serializers.
 *
 * Four views + preference serializer:
 *   serializeForApplicant  — plain-language, no provider/agency internals
 *   serializeForProvider   — workflow context, actionable next steps
 *   serializeForAgency     — scope-safe, no applicant casework detail
 *   serializeForAdmin      — full metadata, diagnostic info
 *   serializePreferences   — all toggle fields for settings UI
 *
 * **Rule:** body is ALWAYS plain language. No raw case notes, message content,
 * or document content. The serializer does not need to sanitize — the
 * createNotificationRecord function enforces this at write time.
 */

import type { NotificationRow, NotificationPreferencesRow } from "./types";
import type { NotificationView, NotificationPreferenceView } from "./notificationTypes";

// ---------------------------------------------------------------------------
// Applicant — plain language, no internals
// ---------------------------------------------------------------------------

export function serializeForApplicant(row: NotificationRow): NotificationView {
  return {
    id: row.id,
    category: row.type,
    title: row.title,
    body: row.body,
    status: row.status,
    linkedObjectType: (row.metadata as Record<string, unknown>)?.linked_object_type as string | null ?? null,
    linkedObjectId: (row.metadata as Record<string, unknown>)?.linked_object_id as string | null ?? null,
    actionUrl: row.action_url,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

// ---------------------------------------------------------------------------
// Provider — same shape but with org context
// ---------------------------------------------------------------------------

export interface ProviderNotificationView extends NotificationView {
  organizationId: string | null;
}

export function serializeForProvider(row: NotificationRow): ProviderNotificationView {
  return {
    ...serializeForApplicant(row),
    organizationId: row.organization_id,
  };
}

// ---------------------------------------------------------------------------
// Agency — scope-safe, no applicant casework detail
// ---------------------------------------------------------------------------

export interface AgencyNotificationView {
  id: string;
  category: string;
  title: string;
  body: string | null;
  status: string;
  createdAt: string;
}

export function serializeForAgency(row: NotificationRow): AgencyNotificationView {
  return {
    id: row.id,
    category: row.type,
    title: row.title,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Admin — full metadata
// ---------------------------------------------------------------------------

export function serializeForAdmin(row: NotificationRow): NotificationRow {
  return row;
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export function serializePreferences(
  prefs: NotificationPreferencesRow,
): NotificationPreferenceView {
  return {
    inAppEnabled: prefs.in_app_enabled,
    emailEnabled: prefs.email_enabled,
    smsEnabled: prefs.sms_enabled,
    muteSensitivePreviews: prefs.mute_sensitive_previews,
    categoryOverrides: prefs.preferences,
  };
}
