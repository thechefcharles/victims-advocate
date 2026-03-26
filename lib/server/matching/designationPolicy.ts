/**
 * Phase F: How current org designation may softly influence matching — never punitive.
 */

import type { OrgDesignationRow } from "@/lib/server/designations/types";
import type { MatchEvaluation } from "./types";
import {
  BOOST_COMPREHENSIVE_MED_HIGH,
  BOOST_ESTABLISHED_MED_HIGH,
  BOOST_FOUNDATIONAL_MED_HIGH,
  MATCHING_THRESHOLDS,
  BOOST_NEUTRAL,
  MAX_DESIGNATION_SCORE_BOOST,
} from "./config";
import { designationMatchReasonText } from "./reasons";

export type DesignationPolicyResult = {
  boostPoints: number;
  /** Public-safe one-line when boost applied */
  reason: string | null;
  /** True when score boost > 0 (not tie-break alone). */
  scoreInfluenced: boolean;
};

function isMediumOrHigh(
  c: OrgDesignationRow["designation_confidence"] | undefined
): boolean {
  return c === "medium" || c === "high";
}

/**
 * Compute bounded designation boost. Never negative.
 * Sparse data / low confidence → no boost (no suppression of fit).
 */
export function computeDesignationMatchPolicy(
  designation: OrgDesignationRow | null,
  ev: MatchEvaluation
): DesignationPolicyResult {
  // Only plausible matches can receive a trust boost.
  if (ev.fit_match_score < MATCHING_THRESHOLDS.possible_min_score) {
    return { boostPoints: BOOST_NEUTRAL, reason: null, scoreInfluenced: false };
  }

  if (!designation) {
    return { boostPoints: BOOST_NEUTRAL, reason: null, scoreInfluenced: false };
  }

  if (designation.designation_confidence === "low") {
    return { boostPoints: BOOST_NEUTRAL, reason: null, scoreInfluenced: false };
  }

  if (designation.designation_tier === "insufficient_data") {
    return { boostPoints: BOOST_NEUTRAL, reason: null, scoreInfluenced: false };
  }

  if (!isMediumOrHigh(designation.designation_confidence)) {
    return { boostPoints: BOOST_NEUTRAL, reason: null, scoreInfluenced: false };
  }

  let boost = BOOST_NEUTRAL;
  switch (designation.designation_tier) {
    case "comprehensive":
      boost = BOOST_COMPREHENSIVE_MED_HIGH;
      break;
    case "established":
      boost = BOOST_ESTABLISHED_MED_HIGH;
      break;
    case "foundational":
      boost = BOOST_FOUNDATIONAL_MED_HIGH;
      break;
    default:
      boost = BOOST_NEUTRAL;
  }

  boost = Math.min(MAX_DESIGNATION_SCORE_BOOST, boost);
  const reason =
    boost > 0 ? designationMatchReasonText(designation.designation_tier) : null;

  return {
    boostPoints: boost,
    reason,
    scoreInfluenced: boost > 0,
  };
}

/** Ordinal for deterministic tie-breaking (higher = prefer when fits are close). */
export function designationTieBreakOrdinal(
  designation: OrgDesignationRow | null
): number {
  if (!designation || designation.designation_confidence === "low") {
    return 0;
  }
  if (designation.designation_tier === "insufficient_data") {
    return 0;
  }
  if (!isMediumOrHigh(designation.designation_confidence)) {
    return 0;
  }
  switch (designation.designation_tier) {
    case "comprehensive":
      return 4;
    case "established":
      return 3;
    case "foundational":
      return 2;
    default:
      return 0;
  }
}
