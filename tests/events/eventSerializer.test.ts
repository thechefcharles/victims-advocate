/**
 * Domain 4.3 — Event serializer tests (3 tests)
 *
 * Tests that each serializer exposes only the correct fields.
 */

import { describe, it, expect } from "vitest";
import {
  serializeForPublic,
  serializeForProvider,
  serializeForAdmin,
} from "@/lib/server/events/eventSerializer";
import type { EventRow } from "@/lib/server/events/eventTypes";

const mockRow: EventRow = {
  id: "evt-1",
  organization_id: "org-a",
  program_id: "prog-1",
  title: "Intake Info Session",
  description: "Open session for new applicants.",
  event_type: "info_session",
  start_at: "2026-05-10T18:00:00Z",
  end_at: "2026-05-10T19:00:00Z",
  timezone: "America/Chicago",
  location: "Main Office - Room 101",
  modality: "hybrid",
  status: "published",
  audience_scope: "applicant_visible",
  capacity: 20,
  registered_count: 7,
  registration_open: true,
  created_by: "user-1",
  created_at: "2026-04-09T00:00:00Z",
  updated_at: "2026-04-09T00:00:00Z",
};

describe("event serializer", () => {
  it("public serializer excludes provider-internal metadata (audience_scope, registered_count, created_by)", () => {
    const view = serializeForPublic(mockRow);
    expect(view.id).toBe("evt-1");
    expect(view.title).toBe("Intake Info Session");
    expect(view.status).toBe("published");
    expect(view.capacity).toBe(20);
    expect(view.remaining).toBe(13); // 20 - 7
    expect(view.registration_open).toBe(true);
    // Provider-internal fields must be absent
    expect((view as Record<string, unknown>).audience_scope).toBeUndefined();
    expect((view as Record<string, unknown>).registered_count).toBeUndefined();
    expect((view as Record<string, unknown>).created_by).toBeUndefined();
    expect((view as Record<string, unknown>).created_at).toBeUndefined();
    expect((view as Record<string, unknown>).updated_at).toBeUndefined();
  });

  it("provider serializer includes operational fields (audience_scope, registered_count, created_by)", () => {
    const view = serializeForProvider(mockRow);
    expect(view.audience_scope).toBe("applicant_visible");
    expect(view.registered_count).toBe(7);
    expect(view.remaining).toBe(13);
    expect(view.created_by).toBe("user-1");
    expect(view.created_at).toBe("2026-04-09T00:00:00Z");
  });

  it("audience_scope filtering respected — admin serializer returns full row", () => {
    const view = serializeForAdmin(mockRow);
    expect(view.audience_scope).toBe("applicant_visible");
    expect(view.registered_count).toBe(7);
    expect(view.created_by).toBe("user-1");
    // Admin view MUST preserve audience_scope untouched
    expect(view.audience_scope).toBe(mockRow.audience_scope);
  });
});
