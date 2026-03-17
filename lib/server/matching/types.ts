/**
 * Phase B: Structured input for organization matching (intake-agnostic).
 */

export type MatchingInput = {
  service_types_needed: string[];
  preferred_language: string | null;
  state_code: string | null;
  county: string | null;
  zip_code: string | null;
  virtual_ok: boolean;
  needs_accessibility_features: string[];
  special_population_flags: string[];
  urgent: boolean | null;
  /** True when few signals — UI should suggest more intake detail */
  intake_sparse: boolean;
};

export type OrgRowForMatching = {
  id: string;
  name: string;
  service_types: string[];
  languages: string[];
  coverage_area: Record<string, unknown>;
  intake_methods: string[];
  hours: Record<string, unknown>;
  accepting_clients: boolean;
  capacity_status: string;
  avg_response_time_hours: number | null;
  special_populations: string[];
  accessibility_features: string[];
  profile_status: string;
  profile_last_updated_at: string | null;
};

export type MatchEvaluation = {
  organization_id: string;
  organization_name: string;
  match_score: number;
  match_tier: "strong_match" | "possible_match" | "limited_match";
  strong_match: boolean;
  possible_match: boolean;
  limited_match: boolean;
  reasons: string[];
  flags: string[];
  service_overlap: string[];
  language_match: boolean;
  accessibility_match: string[];
  capacity_signal: string | null;
  virtual_ok: boolean | null;
  profile_completeness_score: number;
};

export type OrganizationMatchRunRow = {
  id: string;
  created_at: string;
  case_id: string;
  scope_organization_id: string;
  organization_id: string;
  organization_name: string;
  organization_profile_snapshot: Record<string, unknown>;
  match_input_snapshot: Record<string, unknown>;
  match_score: number;
  match_tier: string;
  strong_match: boolean;
  possible_match: boolean;
  limited_match: boolean;
  reasons: string[];
  flags: string[];
  metadata: Record<string, unknown>;
  run_group_id: string;
  actor_user_id: string | null;
};
