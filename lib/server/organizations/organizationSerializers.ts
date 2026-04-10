/**
 * Domain 3.2 — Organization serializers.
 * Rule 5: never expose raw DB responses. All org data must pass through one of these.
 *
 * Three views:
 *   serializeOrgPublicView  — discovery surface (applicants, anonymous)
 *   serializeOrgInternalView — org members' own view (includes operational fields)
 *   serializeOrgAdminView   — platform admin view (all enumerated fields)
 */

import type { OrganizationProfileRow } from "./types";
import type { OrgLifecycleStatus, OrgPublicProfileStatus } from "./state";

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export type OrgPublicView = {
  id: string;
  name: string;
  type: string;
  public_profile_status: OrgPublicProfileStatus | null;
  profile_stage: string | null;
  states_of_operation: string[] | null;
  service_types: string[];
  languages: string[];
  intake_methods: string[];
  accepting_clients: boolean;
  capacity_status: string;
  special_populations: string[];
  accessibility_features: string[];
};

export type OrgInternalView = OrgPublicView & {
  ein: string | null;
  lifecycle_status: OrgLifecycleStatus | null;
  completeness_pct: number | null;
  quality_tier: string | null;
  tier_updated_at: string | null;
  last_profile_update: string | null;
  activation_submitted_at: string | null;
  compliance_profiles: string[] | null;
  funding_sources: string[] | null;
  avg_response_time_hours: number | null;
  profile_status: string;
  profile_last_updated_at: string | null;
  billing_plan_key: string | null;
  billing_status: string | null;
};

export type OrgAdminView = OrgInternalView & {
  /** Operational platform status: active | suspended | archived */
  status: string;
  created_by: string | null;
};

// ---------------------------------------------------------------------------
// Serializers (pure functions — no DB calls, no async)
// ---------------------------------------------------------------------------

export function serializeOrgPublicView(row: OrganizationProfileRow): OrgPublicView {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    public_profile_status: (row.public_profile_status as OrgPublicProfileStatus) ?? null,
    profile_stage: row.profile_stage ?? null,
    states_of_operation: ((row as Record<string, unknown>).states_of_operation as string[]) ?? null,
    service_types: row.service_types ?? [],
    languages: row.languages ?? [],
    intake_methods: row.intake_methods ?? [],
    accepting_clients: row.accepting_clients ?? false,
    capacity_status: row.capacity_status ?? "unknown",
    special_populations: row.special_populations ?? [],
    accessibility_features: row.accessibility_features ?? [],
  };
}

export function serializeOrgInternalView(row: OrganizationProfileRow): OrgInternalView {
  const raw = row as Record<string, unknown>;
  return {
    ...serializeOrgPublicView(row),
    ein: (raw.ein as string) ?? null,
    lifecycle_status: (row.lifecycle_status as OrgLifecycleStatus) ?? null,
    completeness_pct: (raw.completeness_pct as number) ?? null,
    quality_tier: (raw.quality_tier as string) ?? null,
    tier_updated_at: (raw.tier_updated_at as string) ?? null,
    last_profile_update: (raw.last_profile_update as string) ?? null,
    activation_submitted_at: row.activation_submitted_at ?? null,
    compliance_profiles: (raw.compliance_profiles as string[]) ?? null,
    funding_sources: (raw.funding_sources as string[]) ?? null,
    avg_response_time_hours: row.avg_response_time_hours ?? null,
    profile_status: row.profile_status,
    profile_last_updated_at: row.profile_last_updated_at ?? null,
    billing_plan_key: row.billing_plan_key ?? null,
    billing_status: row.billing_status ?? null,
  };
}

export function serializeOrgAdminView(row: OrganizationProfileRow): OrgAdminView {
  const raw = row as Record<string, unknown>;
  return {
    ...serializeOrgInternalView(row),
    status: row.status,
    created_by: (raw.created_by as string) ?? null,
  };
}
