/**
 * Domain 4.3 — Event service layer.
 *
 * Orchestrates state machine + repository. Does NOT reuse appointment services —
 * events and appointments are fully separate domains.
 *
 * Key guards:
 *   - audience_scope is required on create (no default)
 *   - registerForEvent only works on published events with registration_open
 *   - Capacity check runs before every registration write
 */

import { AppError } from "@/lib/server/api";
import type { AuthContext } from "@/lib/server/auth";
import type {
  EventRow,
  CreateEventInput,
  UpdateEventInput,
  EventStatus,
  EventAudienceScope,
  EventRegistrationRow,
} from "./eventTypes";
import { EVENT_AUDIENCE_SCOPES } from "./eventTypes";
import {
  getEventById,
  listVisibleEvents,
  listProviderScopedEvents,
  createEvent as dbCreateEvent,
  updateEventFields,
  updateEventStatus,
  incrementRegisteredCount,
  createEventRegistration,
  cancelEventRegistration,
  findActiveRegistration,
  listEventRegistrationsByEventId,
} from "./eventRepository";
import { validateEventTransition } from "./eventStateMachine";

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function validateEventAudienceScope(scope: unknown): asserts scope is EventAudienceScope {
  if (typeof scope !== "string" || !EVENT_AUDIENCE_SCOPES.includes(scope as EventAudienceScope)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `audience_scope is required. Must be one of: ${EVENT_AUDIENCE_SCOPES.join(", ")}.`,
      undefined,
      422,
    );
  }
}

export function validateEventCapacity(event: EventRow): void {
  if (event.capacity != null && event.registered_count >= event.capacity) {
    throw new AppError(
      "CONFLICT",
      "Event is at capacity.",
      { capacity: event.capacity, registered_count: event.registered_count },
      409,
    );
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createEvent(params: {
  ctx: AuthContext;
  input: CreateEventInput;
}): Promise<EventRow> {
  const { ctx, input } = params;

  // audience_scope is non-negotiable — every event must have explicit visibility
  validateEventAudienceScope(input.audience_scope);

  if (new Date(input.end_at) <= new Date(input.start_at)) {
    throw new AppError("VALIDATION_ERROR", "end_at must be after start_at.", undefined, 422);
  }

  return dbCreateEvent({ ...input, created_by: ctx.userId });
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getEvent(params: { ctx: AuthContext; id: string }): Promise<EventRow> {
  const event = await getEventById(params.id);
  if (!event) throw new AppError("NOT_FOUND", "Event not found", undefined, 404);
  return event;
}

export async function listEvents(params: {
  ctx: AuthContext;
  scope: "public" | "provider";
  organizationId?: string;
  programId?: string;
  status?: EventStatus;
}): Promise<EventRow[]> {
  if (params.scope === "public") {
    return listVisibleEvents({
      organizationId: params.organizationId,
      programId: params.programId,
    });
  }
  if (!params.organizationId) {
    throw new AppError(
      "VALIDATION_ERROR",
      "organizationId required for provider scope.",
      undefined,
      422,
    );
  }
  return listProviderScopedEvents(params.organizationId, {
    status: params.status,
    programId: params.programId,
  });
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateEvent(params: {
  ctx: AuthContext;
  id: string;
  fields: UpdateEventInput;
}): Promise<EventRow> {
  const event = await getEventById(params.id);
  if (!event) throw new AppError("NOT_FOUND", "Event not found", undefined, 404);

  if (params.fields.audience_scope) {
    validateEventAudienceScope(params.fields.audience_scope);
  }

  return updateEventFields({ id: params.id, fields: params.fields });
}

// ---------------------------------------------------------------------------
// Lifecycle transitions (all explicit POST action endpoints, never PATCH)
// ---------------------------------------------------------------------------

export async function publishEvent(params: {
  ctx: AuthContext;
  id: string;
}): Promise<EventRow> {
  const event = await getEventById(params.id);
  if (!event) throw new AppError("NOT_FOUND", "Event not found", undefined, 404);
  validateEventTransition(event.status, "published");
  // Opening registration on publish is a reasonable default for v1.
  return updateEventStatus({ id: params.id, status: "published", registrationOpen: true });
}

export async function cancelEvent(params: {
  ctx: AuthContext;
  id: string;
  reason?: string | null;
}): Promise<EventRow> {
  const event = await getEventById(params.id);
  if (!event) throw new AppError("NOT_FOUND", "Event not found", undefined, 404);
  validateEventTransition(event.status, "cancelled");
  // Close registration on cancel.
  return updateEventStatus({ id: params.id, status: "cancelled", registrationOpen: false });
}

export async function closeEvent(params: {
  ctx: AuthContext;
  id: string;
}): Promise<EventRow> {
  const event = await getEventById(params.id);
  if (!event) throw new AppError("NOT_FOUND", "Event not found", undefined, 404);
  validateEventTransition(event.status, "closed");
  return updateEventStatus({ id: params.id, status: "closed", registrationOpen: false });
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export async function registerForEvent(params: {
  ctx: AuthContext;
  eventId: string;
}): Promise<EventRegistrationRow> {
  const event = await getEventById(params.eventId);
  if (!event) throw new AppError("NOT_FOUND", "Event not found", undefined, 404);

  // Status guard — registration only on published events
  if (event.status !== "published") {
    throw new AppError(
      "VALIDATION_ERROR",
      `Cannot register for an event with status '${event.status}'. Only published events accept registrations.`,
      undefined,
      422,
    );
  }

  if (!event.registration_open) {
    throw new AppError("VALIDATION_ERROR", "Registration is not open for this event.", undefined, 422);
  }

  // Capacity guard — throws CONFLICT if full
  validateEventCapacity(event);

  // Idempotency: if the user already has an active registration, return it
  const existing = await findActiveRegistration({
    event_id: params.eventId,
    participant_id: params.ctx.userId,
  });
  if (existing) return existing;

  const registration = await createEventRegistration({
    event_id: params.eventId,
    participant_id: params.ctx.userId,
  });

  // Increment registered_count (best-effort; greenfield v1)
  await incrementRegisteredCount({ id: params.eventId, delta: 1 });

  return registration;
}

export async function unregisterFromEvent(params: {
  ctx: AuthContext;
  eventId: string;
}): Promise<EventRegistrationRow | null> {
  const event = await getEventById(params.eventId);
  if (!event) throw new AppError("NOT_FOUND", "Event not found", undefined, 404);

  const cancelled = await cancelEventRegistration({
    event_id: params.eventId,
    participant_id: params.ctx.userId,
  });

  if (cancelled) {
    await incrementRegisteredCount({ id: params.eventId, delta: -1 });
  }

  return cancelled;
}

// ---------------------------------------------------------------------------
// Visibility resolver (for external callers — e.g. UI route handlers)
// ---------------------------------------------------------------------------

export function resolveEventVisibility(event: EventRow): {
  isPubliclyVisible: boolean;
  reason: string;
} {
  if (event.status !== "published") {
    return { isPubliclyVisible: false, reason: `status is '${event.status}'` };
  }
  if (event.audience_scope === "provider_internal" || event.audience_scope === "invite_only") {
    return { isPubliclyVisible: false, reason: `audience_scope is '${event.audience_scope}'` };
  }
  return { isPubliclyVisible: true, reason: "published + public/applicant_visible" };
}

// ---------------------------------------------------------------------------
// Registration list helper (for provider management view)
// ---------------------------------------------------------------------------

export async function listRegistrationsForEvent(params: {
  ctx: AuthContext;
  eventId: string;
}): Promise<EventRegistrationRow[]> {
  return listEventRegistrationsByEventId(params.eventId);
}
