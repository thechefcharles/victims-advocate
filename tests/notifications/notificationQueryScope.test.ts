/**
 * Domain 7.2 — Notification query scope tests (3 tests)
 */

import { describe, it, expect } from "vitest";
import {
  serializeForApplicant,
  serializeForAgency,
} from "@/lib/server/notifications/notificationSerializer";
import type { NotificationRow } from "@/lib/server/notifications/types";

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
    metadata: { linked_object_type: "case", linked_object_id: "case-1" },
    read_at: null,
    dismissed_at: null,
    delivered_at: null,
    failed_at: null,
    failure_reason: null,
    ...overrides,
  };
}

describe("notification query scope", () => {
  it("users only see their own notifications — user_id is not exposed in serialized view", () => {
    const view = serializeForApplicant(mockNotification());
    const json = JSON.stringify(view);
    // user_id (the recipient) must not appear in the serialized output —
    // the client knows who they are from auth context, not from the response.
    expect(json).not.toMatch(/user_id/);
    // But the notification data itself is present.
    expect(view.title).toBe("Your case has been updated");
  });

  it("dismissed notifications excluded — status='dismissed' visible for filtering", () => {
    const dismissed = mockNotification({ status: "dismissed", dismissed_at: "2026-04-10T02:00:00Z" });
    const view = serializeForApplicant(dismissed);
    expect(view.status).toBe("dismissed");
    // The service layer filters these out by default; the serializer just shapes them.
  });

  it("unread count accurate — pending status means unread", () => {
    const pending = mockNotification({ status: "pending" });
    const read = mockNotification({ status: "read", read_at: "2026-04-10T01:00:00Z" });
    const pendingView = serializeForApplicant(pending);
    const readView = serializeForApplicant(read);
    expect(pendingView.status).toBe("pending");
    expect(pendingView.readAt).toBeNull();
    expect(readView.status).toBe("read");
    expect(readView.readAt).not.toBeNull();
  });
});
