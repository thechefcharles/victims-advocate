/**
 * Domain 4.3 — Event repository.
 * All DB access for events and event_registrations.
 *
 * Public visibility enforcement lives at the query level in listVisibleEvents —
 * NOT in UI filters. Public queries strictly filter status='published' AND
 * audience_scope IN ('public', 'applicant_visible').
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type {
  EventRow,
  EventStatus,
  EventAudienceScope,
  EventRegistrationRow,
  CreateEventInput,
  UpdateEventInput,
  EventModality,
} from "./eventTypes";

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function asEventRow(r: Record<string, unknown>): EventRow {
  return {
    id: r.id as string,
    organization_id: r.organization_id as string,
    program_id: (r.program_id as string | null) ?? null,
    title: r.title as string,
    description: (r.description as string | null) ?? null,
    event_type: r.event_type as string,
    start_at: r.start_at as string,
    end_at: r.end_at as string,
    timezone: (r.timezone as string) ?? "UTC",
    location: (r.location as string | null) ?? null,
    modality: (r.modality as EventModality) ?? "in_person",
    status: r.status as EventStatus,
    audience_scope: r.audience_scope as EventAudienceScope,
    capacity: (r.capacity as number | null) ?? null,
    registered_count: (r.registered_count as number) ?? 0,
    registration_open: (r.registration_open as boolean) ?? false,
    created_by: r.created_by as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Event reads
// ---------------------------------------------------------------------------

export async function getEventById(id: string): Promise<EventRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", "Event lookup failed", undefined, 500);
  return data ? asEventRow(data as Record<string, unknown>) : null;
}

/**
 * Public/applicant-facing list — strictly filters published events with
 * public or applicant_visible audience scope. This is enforced at the
 * query level, not through UI hiding.
 */
export async function listVisibleEvents(filters?: {
  organizationId?: string;
  programId?: string;
}): Promise<EventRow[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .in("audience_scope", ["public", "applicant_visible"])
    .order("start_at", { ascending: true });

  if (filters?.organizationId) {
    query = query.eq("organization_id", filters.organizationId);
  }
  if (filters?.programId) {
    query = query.eq("program_id", filters.programId);
  }

  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL", "Failed to list visible events", undefined, 500);
  return (data ?? []).map((r) => asEventRow(r as Record<string, unknown>));
}

/**
 * Provider-scoped list — returns all events for the org including drafts and
 * provider_internal. NOT filtered by audience_scope or status.
 */
export async function listProviderScopedEvents(
  organizationId: string,
  filters?: { status?: EventStatus; programId?: string },
): Promise<EventRow[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("start_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.programId) {
    query = query.eq("program_id", filters.programId);
  }

  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL", "Failed to list provider events", undefined, 500);
  return (data ?? []).map((r) => asEventRow(r as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Event writes
// ---------------------------------------------------------------------------

export async function insertEvent(
  input: CreateEventInput & { created_by: string },
): Promise<EventRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("events")
    .insert({
      organization_id: input.organization_id,
      program_id: input.program_id ?? null,
      title: input.title,
      description: input.description ?? null,
      event_type: input.event_type,
      start_at: input.start_at,
      end_at: input.end_at,
      timezone: input.timezone ?? "UTC",
      location: input.location ?? null,
      modality: input.modality ?? "in_person",
      status: "draft",
      audience_scope: input.audience_scope,
      capacity: input.capacity ?? null,
      registered_count: 0,
      registration_open: false,
      created_by: input.created_by,
    })
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to create event", undefined, 500);
  return asEventRow(data as Record<string, unknown>);
}

export async function updateEventFields(params: {
  id: string;
  fields: UpdateEventInput;
}): Promise<EventRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("events")
    .update(params.fields)
    .eq("id", params.id)
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to update event", undefined, 500);
  return asEventRow(data as Record<string, unknown>);
}

export async function updateEventStatus(params: {
  id: string;
  status: EventStatus;
  registrationOpen?: boolean;
}): Promise<EventRow> {
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = { status: params.status };
  if (params.registrationOpen !== undefined) {
    update.registration_open = params.registrationOpen;
  }
  const { data, error } = await supabase
    .from("events")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to update event status", undefined, 500);
  return asEventRow(data as Record<string, unknown>);
}

/** Atomic increment (registered_count += delta). Used by registration flow. */
export async function incrementRegisteredCount(params: {
  id: string;
  delta: number;
}): Promise<EventRow> {
  const supabase = getSupabaseAdmin();
  // Read-modify-write; in production this would use a DB-level atomic update,
  // but for v1 greenfield this is acceptable.
  const current = await getEventById(params.id);
  if (!current) throw new AppError("NOT_FOUND", "Event not found", undefined, 404);
  const newCount = Math.max(0, current.registered_count + params.delta);
  const { data, error } = await supabase
    .from("events")
    .update({ registered_count: newCount })
    .eq("id", params.id)
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to update registered count", undefined, 500);
  return asEventRow(data as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Registration reads + writes
// ---------------------------------------------------------------------------

export async function insertEventRegistration(params: {
  event_id: string;
  participant_id: string;
}): Promise<EventRegistrationRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("event_registrations")
    .insert({
      event_id: params.event_id,
      participant_id: params.participant_id,
      status: "registered",
    })
    .select()
    .single();
  if (error) throw new AppError("INTERNAL", "Failed to create event registration", undefined, 500);
  return data as EventRegistrationRow;
}

export async function cancelEventRegistration(params: {
  event_id: string;
  participant_id: string;
}): Promise<EventRegistrationRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("event_registrations")
    .update({ status: "cancelled" })
    .eq("event_id", params.event_id)
    .eq("participant_id", params.participant_id)
    .select()
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", "Failed to cancel event registration", undefined, 500);
  return (data as EventRegistrationRow | null) ?? null;
}

export async function listEventRegistrationsByEventId(
  eventId: string,
): Promise<EventRegistrationRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("event_registrations")
    .select("*")
    .eq("event_id", eventId);
  if (error) throw new AppError("INTERNAL", "Failed to list event registrations", undefined, 500);
  return (data ?? []) as EventRegistrationRow[];
}

export async function findActiveRegistration(params: {
  event_id: string;
  participant_id: string;
}): Promise<EventRegistrationRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("event_registrations")
    .select("*")
    .eq("event_id", params.event_id)
    .eq("participant_id", params.participant_id)
    .eq("status", "registered")
    .maybeSingle();
  if (error) throw new AppError("INTERNAL", "Failed to check existing registration", undefined, 500);
  return (data as EventRegistrationRow | null) ?? null;
}
