/**
 * Domain 4.3 — Event types.
 *
 * Events are first-class org/program-level scheduled offerings (workshops,
 * info sessions, clinics). NOT appointments (4.2) — appointments are
 * case-bound, single-applicant, operational logistics.
 *
 * Event services MUST NEVER reuse appointment services.
 */

// ---------------------------------------------------------------------------
// Status + Audience Scope enums
// ---------------------------------------------------------------------------

export const EVENT_STATUSES = ["draft", "published", "cancelled", "closed"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_TERMINAL_STATUSES = new Set<EventStatus>(["closed"]);

export const EVENT_AUDIENCE_SCOPES = [
  "public",
  "applicant_visible",
  "provider_internal",
  "invite_only",
] as const;
export type EventAudienceScope = (typeof EVENT_AUDIENCE_SCOPES)[number];

/** Audience scopes visible to applicants / unauthenticated public queries. */
export const PUBLIC_VISIBLE_SCOPES: EventAudienceScope[] = ["public", "applicant_visible"];

export const EVENT_MODALITIES = ["in_person", "virtual", "hybrid"] as const;
export type EventModality = (typeof EVENT_MODALITIES)[number];

// ---------------------------------------------------------------------------
// DB row shapes
// ---------------------------------------------------------------------------

export type EventRow = {
  id: string;
  organization_id: string;
  program_id: string | null;
  title: string;
  description: string | null;
  event_type: string;
  start_at: string;
  end_at: string;
  timezone: string;
  location: string | null;
  modality: EventModality;
  status: EventStatus;
  audience_scope: EventAudienceScope;
  capacity: number | null;
  registered_count: number;
  registration_open: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type EventRegistrationRow = {
  id: string;
  event_id: string;
  participant_id: string;
  status: "registered" | "cancelled";
  registered_at: string;
};

// ---------------------------------------------------------------------------
// Service input types
// ---------------------------------------------------------------------------

export type CreateEventInput = {
  organization_id: string;
  program_id?: string | null;
  title: string;
  description?: string | null;
  event_type: string;
  start_at: string;
  end_at: string;
  timezone?: string;
  location?: string | null;
  modality?: EventModality;
  audience_scope: EventAudienceScope; // required — no default
  capacity?: number | null;
};

export type UpdateEventInput = Partial<
  Pick<
    EventRow,
    | "title"
    | "description"
    | "event_type"
    | "start_at"
    | "end_at"
    | "timezone"
    | "location"
    | "modality"
    | "audience_scope"
    | "capacity"
    | "registration_open"
  >
>;

// ---------------------------------------------------------------------------
// Capacity state view
// ---------------------------------------------------------------------------

export type EventCapacityState = {
  capacity: number | null;
  registered_count: number;
  remaining: number | null; // null when capacity is unlimited
  registration_open: boolean;
  status: EventStatus;
};

export function deriveCapacityState(event: EventRow): EventCapacityState {
  return {
    capacity: event.capacity,
    registered_count: event.registered_count,
    remaining: event.capacity != null ? Math.max(0, event.capacity - event.registered_count) : null,
    registration_open: event.registration_open,
    status: event.status,
  };
}
