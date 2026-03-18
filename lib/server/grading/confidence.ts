/**
 * Phase C: Aggregate confidence and flags — sparse data → low certainty, not “bad org”.
 */

import type { GradingCategoryKey } from "./config";
import type { CategoryScoreDetail, OrgScoringInputs, ScoreConfidence } from "./types";

export function aggregateOverallConfidence(params: {
  categoryConfidences: Record<GradingCategoryKey, ScoreConfidence>;
  inputs: OrgScoringInputs;
}): ScoreConfidence {
  const vals = Object.values(params.categoryConfidences);
  const lows = vals.filter((v) => v === "low").length;
  const highs = vals.filter((v) => v === "high").length;
  const { inputs } = params;

  if (inputs.case_count_total < 2 && inputs.case_messages_total < 3) {
    return "low";
  }
  if (lows >= 4) return "low";
  if (highs >= 4 && inputs.case_count_total >= 5) return "high";
  if (highs >= 3 && lows <= 2) return "medium";
  return "medium";
}

export function buildGradingFlags(params: {
  overallConfidence: ScoreConfidence;
  inputs: OrgScoringInputs;
  categoryConfidences: Record<GradingCategoryKey, ScoreConfidence>;
}): string[] {
  const flags: string[] = [];
  const { inputs, overallConfidence, categoryConfidences } = params;

  if (inputs.case_count_total < 5) {
    flags.push("limited_case_volume");
  }
  if (inputs.profile_completeness_0_1 < 0.4) {
    flags.push("profile_incomplete");
  }
  const lowCats = Object.values(categoryConfidences).filter((c) => c === "low").length;
  if (lowCats >= 3 || (inputs.case_count_total < 3 && inputs.routing_ratio_0_1 < 0.1)) {
    flags.push("insufficient_data");
  }
  if (
    inputs.routing_ratio_0_1 < 0.15 &&
    inputs.completeness_ratio_0_1 < 0.15 &&
    inputs.case_count_total >= 3
  ) {
    flags.push("workflow_usage_low");
  }
  if (overallConfidence === "high") {
    flags.push("high_confidence_score");
  }
  if (overallConfidence === "low") {
    flags.push("low_confidence_score");
  }
  return [...new Set(flags)];
}
