/**
 * Phase 3: Explicit matching model, readable in one file.
 * Fit-first scoring with a small bounded designation boost.
 */

export const MATCHING_SCORE_WEIGHTS = {
  service_overlap_each: 18,
  service_overlap_cap: 45,
  coverage_state_match: 24,
  coverage_virtual_fallback: 18,
  coverage_unknown: 8,
  capacity_open_accepting: 16,
  capacity_accepting: 13,
  capacity_open_only: 11,
  capacity_limited: 7,
  capacity_waitlist: 4,
  capacity_other: 2,
  language_match: 10,
  language_unknown: 2,
  language_non_match: 0,
  accessibility_each: 4,
  accessibility_cap: 10,
  special_population_each: 3,
  special_population_cap: 8,
  response_fast_24h: 5,
  response_72h: 4,
  response_week: 2,
  response_slow_or_unknown: 1,
} as const;

export const MATCHING_THRESHOLDS = {
  strong_min_score: 66,
  possible_min_score: 36,
  strong_min_completeness: 0.4,
  limited_profile_completeness: 0.3,
  weak_service_overlap_ratio: 0.34,
} as const;

/** Max points added to fit score from designation (out of 100 total scale). */
export const MAX_DESIGNATION_SCORE_BOOST = 3;
/** Boost when tier is comprehensive and confidence is medium/high. */
export const BOOST_COMPREHENSIVE_MED_HIGH = 3;
/** Boost when tier is established and confidence is medium/high. */
export const BOOST_ESTABLISHED_MED_HIGH = 1;
/** Foundational should stay neutral. */
export const BOOST_FOUNDATIONAL_MED_HIGH = 0;
/** Low confidence or insufficient_data: neutral. */
export const BOOST_NEUTRAL = 0;

/**
 * Tie-break is allowed only when fit scores are almost identical.
 * This keeps designation from reordering materially different fit quality.
 */
export const DESIGNATION_TIE_BREAK_FIT_SCORE_BAND = 2;

export const DESIGNATION_POLICY_VERSION = "phase_3_v1";
