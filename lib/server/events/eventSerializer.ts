/**
 * Domain 4.3 — Event serializers.
 *
 * Three context-aware views:
 *   serializeForPublic    — applicant/unauthenticated; excludes provider-internal metadata
 *   serializeForProvider  — full operational detail, lifecycle controls, capacity metrics
 *   serializeForAdmin     — full EventRow + audit metadata
 */

import type { EventRow } from "./eventTypes";
import { deriveCapacityState } from "./eventTypes";

// ---------------------------------------------------------------------------
// Public / applicant view
// ---------------------------------------------------------------------------

export type PublicEventView = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_at: string;
  end_at: string;
  timezone: string;
  location: string | null;
  modality: string;
  status: string;
  organization_id: string;
  program_id: string | null;
  registration_open: boolean;
  capacity: number | null;
  remaining: number | null;
};

/**
 * Public-facing view. Excludes:
 *   - audience_scope (provider-internal metadata)
 *   - registered_count (operational)
 *   - created_by / created_at / updated_at (audit metadata)
 */
export function serializeForPublic(row: EventRow): PublicEventView {
  const capacity = deriveCapacityState(row);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    event_type: row.event_type,
    start_at: row.start_at,
    end_at: row.end_at,
    timezone: row.timezone,
    location: row.location,
    modality: row.modality,
    status: row.status,
    organization_id: row.organization_id,
    program_id: row.program_id,
    registration_open: capacity.registration_open,
    capacity: capacity.capacity,
    remaining: capacity.remaining,
  };
}

// ---------------------------------------------------------------------------
// Provider full view
// ---------------------------------------------------------------------------

export type ProviderEventView = {
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
  modality: string;
  status: string;
  audience_scope: string;
  capacity: number | null;
  registered_count: number;
  remaining: number | null;
  registration_open: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function serializeForProvider(row: EventRow): ProviderEventView {
  const capacity = deriveCapacityState(row);
  return {
    id: row.id,
    organization_id: row.organization_id,
    program_id: row.program_id,
    title: row.title,
    description: row.description,
    event_type: row.event_type,
    start_at: row.start_at,
    end_at: row.end_at,
    timezone: row.timezone,
    location: row.location,
    modality: row.modality,
    status: row.status,
    audience_scope: row.audience_scope,
    capacity: row.capacity,
    registered_count: row.registered_count,
    remaining: capacity.remaining,
    registration_open: row.registration_open,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Admin view (full row)
// ---------------------------------------------------------------------------

export function serializeForAdmin(row: EventRow): EventRow {
  return { ...row };
}
