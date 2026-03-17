/**
 * Phase F: Tunable weights for designation-aware matching.
 * Service fit (Phase B score) dominates; designation adds a small capped boost only.
 */

/** Max points added to fit score from designation (out of 100 total scale). */
export const MAX_DESIGNATION_SCORE_BOOST = 4;

/** Boost when tier is comprehensive and confidence is medium or high. */
export const BOOST_COMPREHENSIVE_MED_HIGH = 4;

/** Boost when tier is established and confidence is medium or high. */
export const BOOST_ESTABLISHED_MED_HIGH = 2;

/** Foundational + medium/high: minimal effect (spec: neutral / very slight). */
export const BOOST_FOUNDATIONAL_MED_HIGH = 0;

/** Low confidence or insufficient_data: no score boost. */
export const BOOST_NEUTRAL = 0;

/**
 * When two orgs have the same tier and integrated score, use designation
 * as tie-breaker only if their *fit* (pre-boost) scores are within this band.
 */
export const DESIGNATION_TIE_BREAK_FIT_SCORE_BAND = 3;

export const DESIGNATION_POLICY_VERSION = "phase_f_v1";
