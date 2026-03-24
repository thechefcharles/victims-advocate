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
  profile_stage: string;
  profile_last_updated_at: string | null;
};

export type MatchEvaluation = {
  organization_id: string;
  organization_name: string;
  /** Integrated score (Phase B fit + capped designation boost). */
  match_score: number;
  /** Phase B fit-only score (before designation boost). */
  fit_match_score: number;
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
  /** Public-safe designation context (nullable when none / not loaded). */
  designation_tier: string | null;
  designation_confidence: string | null;
  designation_summary: string | null;
  designation_influenced_match: boolean;
  designation_reason: string | null;
  /** Internal: points added from designation (omitted from API). */
  designation_boost_points: number;
  /** Internal: tie-break ordering (omitted from API). */
  designation_tie_ordinal: number;
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
  fit_match_score: number | null;
  match_tier: string;
  strong_match: boolean;
  possible_match: boolean;
  limited_match: boolean;
  reasons: string[];
  flags: string[];
  metadata: Record<string, unknown>;
  run_group_id: string;
  actor_user_id: string | null;
  designation_tier: string | null;
  designation_confidence: string | null;
  designation_summary: string | null;
  designation_influenced_match: boolean;
  designation_reason: string | null;
  designation_snapshot: Record<string, unknown>;
  designation_applied: boolean;
};
