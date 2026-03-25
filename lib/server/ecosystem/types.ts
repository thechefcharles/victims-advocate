/**
 * Phase G: Ecosystem intelligence — aggregated, non-PII types.
 */

export type EcosystemFilters = {
  state: string | null;
  county: string | null;
  time_window_days: number;
  service_type: string | null;
  language: string | null;
};

export type GapSeverity = "high" | "medium" | "low";

export type EcosystemGap = {
  gap_type: string;
  severity: GapSeverity;
  region_key: string;
  title: string;
  description: string;
  supporting_metrics: Record<string, number | string>;
  action_hint: string;
};

export type OrgSegmentRow = {
  organization_id: string;
  organization_name: string;
  region_label: string;
  states_covered: string[];
  service_types: string[];
  languages: string[];
  capacity_status: string;
  accepting_clients: boolean;
  profile_status: string;
  profile_stage: string;
  designation_tier: string | null;
  designation_confidence: string | null;
  profile_completeness: "complete" | "partial" | "minimal";
  virtual_services: boolean;
  routing_runs_in_window: number;
  completeness_runs_in_window: number;
  messages_sent_in_window: number;
  match_rows_as_target_in_window: number;
  internal_followup_cue: string;
};

export type EcosystemOverviewResponse = {
  filters: EcosystemFilters;
  summary: {
    active_orgs: number;
    accepting_clients_orgs: number;
    match_runs_in_window: number;
    match_runs_no_result: number;
    match_runs_low_tier_only: number;
    cases_created_in_window: number;
    orgs_with_current_designation: number;
    designation_distribution: Record<string, number>;
    capacity_distribution: Record<string, number>;
    response_time_bands: Record<string, number>;
    profile_completeness_distribution: Record<string, number>;
    routing_runs_in_window: number;
    completeness_runs_in_window: number;
    messaging_activity_in_window: number;
  };
  coverage: {
    orgs_by_service_type: Record<string, number>;
    orgs_by_language: Record<string, number>;
    orgs_by_special_population: Record<string, number>;
    orgs_virtual_capable: number;
    demand_service_counts: Record<string, number>;
    demand_language_counts: Record<string, number>;
  };
  demand_supply_gaps: EcosystemGap[];
  org_segments: Array<{
    key: string;
    label: string;
    count: number;
  }>;
  region_flags: string[];
};
