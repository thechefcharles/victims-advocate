/**
 * Domain 7.2 — Notification serializer tests (4 tests)
 */

import { describe, it, expect } from "vitest";
import {
  serializeForApplicant,
  serializeForProvider,
  serializeForAgency,
  serializePreferences,
} from "@/lib/server/notifications/notificationSerializer";
import type { NotificationRow, NotificationPreferencesRow } from "@/lib/server/notifications/types";

function mockNotification(overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id: "n-1",
    created_at: "2026-04-10T00:00:00Z",
    updated_at: "2026-04-10T00:00:00Z",
    user_id: "user-1",
    organization_id: "org-1",
    case_id: "case-1",
    type: "case_update",
    channel: "in_app",
    status: "pending",
    title: "Your case has been updated",
    body: "An advocate reviewed your case.",
    action_url: "/applicant/dashboard",
    preview_safe: true,
    metadata: {
      linked_object_type: "case",
      linked_object_id: "case-1",
      internal_note: "Provider internal context here",
    },
    read_at: null,
    dismissed_at: null,
    delivered_at: null,
    failed_at: null,
    failure_reason: null,
    ...overrides,
  };
}

describe("notification serializer", () => {
  it("applicant serializer excludes provider/agency internal details", () => {
    const view = serializeForApplicant(mockNotification());
    expect(view.title).toBe("Your case has been updated");
    expect(view.body).toBe("An advocate reviewed your case.");
    const json = JSON.stringify(view);
    // Must NOT contain: user_id, organization_id, case_id, channel, metadata internals
    expect(json).not.toMatch(/user_id/);
    expect(json).not.toMatch(/organization_id/);
    expect(json).not.toMatch(/case_id/);
    expect(json).not.toMatch(/channel/);
    expect(json).not.toMatch(/internal_note/);
    expect(json).not.toMatch(/delivered_at/);
    expect(json).not.toMatch(/failed_at/);
  });

  it("notification body is plain language — no raw linked object data", () => {
    const view = serializeForApplicant(mockNotification());
    // Body should be human-readable, not JSON or raw DB content.
    expect(view.body).toBe("An advocate reviewed your case.");
    // The linked object is referenced by type+id, not by content.
    expect(view.linkedObjectType).toBe("case");
    expect(view.linkedObjectId).toBe("case-1");
  });

  it("agency serializer excludes applicant casework detail", () => {
    const view = serializeForAgency(mockNotification());
    const json = JSON.stringify(view);
    // Agency view must NOT contain: case_id, organization_id, action_url, metadata
    expect(json).not.toMatch(/case_id/);
    expect(json).not.toMatch(/organization_id/);
    expect(json).not.toMatch(/action_url/);
    expect(json).not.toMatch(/metadata/);
    expect(json).not.toMatch(/internal_note/);
    // But does contain: id, category, title, body, status, createdAt
    expect(view.title).toBe("Your case has been updated");
    expect(view.status).toBe("pending");
  });

  it("preference serializer includes all editable fields", () => {
    const prefs: NotificationPreferencesRow = {
      id: "p-1",
      created_at: "2026-04-10T00:00:00Z",
      updated_at: "2026-04-10T00:00:00Z",
      user_id: "user-1",
      in_app_enabled: true,
      email_enabled: false,
      sms_enabled: false,
      mute_sensitive_previews: true,
      preferences: { case_update: { email: true } },
    };
    const view = serializePreferences(prefs);
    expect(view.inAppEnabled).toBe(true);
    expect(view.emailEnabled).toBe(false);
    expect(view.smsEnabled).toBe(false);
    expect(view.muteSensitivePreviews).toBe(true);
    expect(view.categoryOverrides).toEqual({ case_update: { email: true } });
    // Must NOT expose user_id or id.
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/user_id/);
    expect(json).not.toMatch(/"id"/);
  });
});
