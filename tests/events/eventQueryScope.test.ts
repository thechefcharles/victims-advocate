/**
 * Domain 4.3 — Event query scope tests (3 tests)
 *
 * Verifies that listEvents routes to the correct repository function and
 * that public/provider scope boundaries are respected.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EventRow } from "@/lib/server/events/eventTypes";

const publicEvent: EventRow = {
  id: "evt-pub",
  organization_id: "org-a",
  program_id: null,
  title: "Public Event",
  description: null,
  event_type: "info_session",
  start_at: "2026-05-10T18:00:00Z",
  end_at: "2026-05-10T19:00:00Z",
  timezone: "UTC",
  location: null,
  modality: "virtual",
  status: "published",
  audience_scope: "public",
  capacity: null,
  registered_count: 0,
  registration_open: true,
  created_by: "user-1",
  created_at: "2026-04-09T00:00:00Z",
  updated_at: "2026-04-09T00:00:00Z",
};

const draftProviderEvent: EventRow = {
  ...publicEvent,
  id: "evt-draft",
  status: "draft",
  audience_scope: "provider_internal",
};

vi.mock("@/lib/server/events/eventRepository", () => ({
  getEventById: vi.fn(),
  listVisibleEvents: vi.fn(),
  listProviderScopedEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEventFields: vi.fn(),
  updateEventStatus: vi.fn(),
  incrementRegisteredCount: vi.fn(),
  createEventRegistration: vi.fn(),
  cancelEventRegistration: vi.fn(),
  findActiveRegistration: vi.fn(),
  listEventRegistrationsByEventId: vi.fn(),
}));

import { listEvents } from "@/lib/server/events/eventService";
import * as repo from "@/lib/server/events/eventRepository";

const applicantCtx = {
  userId: "applicant-1",
  accountType: "applicant" as const,
  orgId: null,
} as Parameters<typeof listEvents>[0]["ctx"];

const providerCtx = {
  userId: "user-1",
  accountType: "provider" as const,
  orgId: "org-a",
} as Parameters<typeof listEvents>[0]["ctx"];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("event query scope", () => {
  it("public scope routes to listVisibleEvents (status=published + public/applicant_visible)", async () => {
    vi.mocked(repo.listVisibleEvents).mockResolvedValue([publicEvent]);
    const results = await listEvents({ ctx: applicantCtx, scope: "public" });
    expect(repo.listVisibleEvents).toHaveBeenCalled();
    expect(repo.listProviderScopedEvents).not.toHaveBeenCalled();
    expect(results[0].status).toBe("published");
    // Must not contain any non-public/non-visible scopes
    for (const e of results) {
      expect(["public", "applicant_visible"]).toContain(e.audience_scope);
    }
  });

  it("provider scope routes to listProviderScopedEvents (all statuses, org-scoped)", async () => {
    vi.mocked(repo.listProviderScopedEvents).mockResolvedValue([publicEvent, draftProviderEvent]);
    const results = await listEvents({
      ctx: providerCtx,
      scope: "provider",
      organizationId: "org-a",
    });
    expect(repo.listProviderScopedEvents).toHaveBeenCalledWith("org-a", expect.anything());
    expect(repo.listVisibleEvents).not.toHaveBeenCalled();
    const statuses = results.map((r) => r.status);
    expect(statuses).toContain("draft");
    expect(statuses).toContain("published");
  });

  it("provider scope without organizationId throws VALIDATION_ERROR", async () => {
    await expect(
      listEvents({ ctx: providerCtx, scope: "provider" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(repo.listProviderScopedEvents).not.toHaveBeenCalled();
  });
});
