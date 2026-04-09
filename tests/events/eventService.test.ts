/**
 * Domain 4.3 — Event service tests (5 tests)
 *
 * Tests service-layer behavior using mocked repository.
 * All DB calls are mocked via vi.mock().
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EventRow, EventRegistrationRow } from "@/lib/server/events/eventTypes";

const mockEvent: EventRow = {
  id: "evt-1",
  organization_id: "org-a",
  program_id: null,
  title: "Intake Info Session",
  description: null,
  event_type: "info_session",
  start_at: "2026-05-10T18:00:00Z",
  end_at: "2026-05-10T19:00:00Z",
  timezone: "UTC",
  location: null,
  modality: "virtual",
  status: "draft",
  audience_scope: "public",
  capacity: 20,
  registered_count: 0,
  registration_open: false,
  created_by: "user-1",
  created_at: "2026-04-09T00:00:00Z",
  updated_at: "2026-04-09T00:00:00Z",
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

import {
  createEvent,
  publishEvent,
  cancelEvent,
  listEvents,
  registerForEvent,
} from "@/lib/server/events/eventService";
import * as repo from "@/lib/server/events/eventRepository";

const ctx = {
  userId: "user-1",
  accountType: "provider" as const,
  orgId: "org-a",
} as Parameters<typeof createEvent>[0]["ctx"];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.createEvent).mockResolvedValue(mockEvent);
  vi.mocked(repo.getEventById).mockResolvedValue(mockEvent);
  vi.mocked(repo.updateEventStatus).mockImplementation(({ status, registrationOpen }) =>
    Promise.resolve({
      ...mockEvent,
      status,
      registration_open: registrationOpen ?? mockEvent.registration_open,
    }),
  );
  vi.mocked(repo.findActiveRegistration).mockResolvedValue(null);
  vi.mocked(repo.incrementRegisteredCount).mockResolvedValue(mockEvent);
});

describe("event service", () => {
  it("createEvent creates in draft with audience_scope required", async () => {
    const result = await createEvent({
      ctx,
      input: {
        organization_id: "org-a",
        title: "Test",
        event_type: "workshop",
        start_at: "2026-05-10T18:00:00Z",
        end_at: "2026-05-10T19:00:00Z",
        audience_scope: "public",
      },
    });
    expect(repo.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ audience_scope: "public", created_by: "user-1" }),
    );
    expect(result.status).toBe("draft");
  });

  it("createEvent with missing audience_scope throws VALIDATION_ERROR", async () => {
    await expect(
      createEvent({
        ctx,
        input: {
          organization_id: "org-a",
          title: "Test",
          event_type: "workshop",
          start_at: "2026-05-10T18:00:00Z",
          end_at: "2026-05-10T19:00:00Z",
          // @ts-expect-error — intentionally missing required field
          audience_scope: undefined,
        },
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(repo.createEvent).not.toHaveBeenCalled();
  });

  it("publishEvent is an explicit state transition (draft → published) and opens registration", async () => {
    const result = await publishEvent({ ctx, id: "evt-1" });
    expect(repo.updateEventStatus).toHaveBeenCalledWith({
      id: "evt-1",
      status: "published",
      registrationOpen: true,
    });
    expect(result.status).toBe("published");
    expect(result.registration_open).toBe(true);
  });

  it("cancelEvent with reason transitions and closes registration", async () => {
    vi.mocked(repo.getEventById).mockResolvedValue({ ...mockEvent, status: "published" });
    const result = await cancelEvent({ ctx, id: "evt-1", reason: "Weather" });
    expect(repo.updateEventStatus).toHaveBeenCalledWith({
      id: "evt-1",
      status: "cancelled",
      registrationOpen: false,
    });
    expect(result.status).toBe("cancelled");
  });

  it("registerForEvent respects status + capacity guards", async () => {
    // Status guard — draft event rejects
    await expect(registerForEvent({ ctx, eventId: "evt-1" })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });

    // Capacity guard — published but at capacity rejects
    vi.mocked(repo.getEventById).mockResolvedValue({
      ...mockEvent,
      status: "published",
      registration_open: true,
      capacity: 10,
      registered_count: 10,
    });
    await expect(registerForEvent({ ctx, eventId: "evt-1" })).rejects.toMatchObject({
      code: "CONFLICT",
    });

    // Happy path — published, open, under capacity
    vi.mocked(repo.getEventById).mockResolvedValue({
      ...mockEvent,
      status: "published",
      registration_open: true,
      capacity: 10,
      registered_count: 5,
    });
    const okRegistration: EventRegistrationRow = {
      id: "reg-1",
      event_id: "evt-1",
      participant_id: "user-1",
      status: "registered",
      registered_at: "2026-04-09T00:00:00Z",
    };
    vi.mocked(repo.createEventRegistration).mockResolvedValue(okRegistration);
    const result = await registerForEvent({ ctx, eventId: "evt-1" });
    expect(result.status).toBe("registered");
    expect(repo.incrementRegisteredCount).toHaveBeenCalledWith({ id: "evt-1", delta: 1 });
  });
});
