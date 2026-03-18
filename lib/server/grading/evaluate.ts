/**
 * Phase C: Deterministic org quality evaluation.
 */

import { CATEGORY_WEIGHTS, ORG_GRADING_VERSION, type GradingCategoryKey } from "./config";
import type { OrgScoringInputs, CategoryScoreDetail, GradingEvaluationResult, ScoreConfidence } from "./types";
import { aggregateOverallConfidence, buildGradingFlags } from "./confidence";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function cat(
  key: GradingCategoryKey,
  score: number,
  confidence: ScoreConfidence,
  reasons: string[],
  input_summary: Record<string, unknown>
): CategoryScoreDetail {
  const weight = CATEGORY_WEIGHTS[key];
  const weighted_score = (clamp(score, 0, 100) / 100) * weight;
  return {
    score: Math.round(clamp(score, 0, 100) * 10) / 10,
    weight,
    weighted_score: Math.round(weighted_score * 100) / 100,
    confidence,
    reasons,
    input_summary,
  };
}

function scoreResponseAccessibility(inps: OrgScoringInputs): CategoryScoreDetail {
  let s = 38;
  const reasons: string[] = [];
  if (inps.accepting_clients) {
    s += 12;
    reasons.push("Organization reports accepting clients");
  }
  if (inps.capacity_status === "open") {
    s += 10;
    reasons.push("Capacity status: open");
  } else if (inps.capacity_status === "limited") {
    s += 7;
    reasons.push("Capacity status: limited");
  } else if (inps.capacity_status === "waitlist") {
    s += 5;
    reasons.push("Capacity status: waitlist");
  }
  s += Math.min(14, inps.languages_count * 4);
  if (inps.languages_count > 0) reasons.push(`${inps.languages_count} language(s) listed`);
  s += Math.min(12, inps.accessibility_count * 3);
  if (inps.accessibility_count > 0)
    reasons.push(`${inps.accessibility_count} accessibility feature(s) listed`);
  s += Math.min(12, inps.intake_methods_count * 3);
  if (inps.intake_methods_count > 0)
    reasons.push(`${inps.intake_methods_count} intake method(s) listed`);
  if (inps.avg_response_time_hours != null) {
    if (inps.avg_response_time_hours <= 48) {
      s += 8;
      reasons.push("Stated average response within ~48 hours");
    } else if (inps.avg_response_time_hours <= 120) {
      s += 4;
      reasons.push("Stated response time within ~5 days");
    }
  }
  s = clamp(s, 0, 100);

  let conf: ScoreConfidence = "low";
  const signals =
    (inps.accepting_clients ? 1 : 0) +
    (inps.capacity_status !== "unknown" ? 1 : 0) +
    (inps.languages_count > 0 ? 1 : 0) +
    (inps.intake_methods_count > 0 ? 1 : 0) +
    (inps.avg_response_time_hours != null ? 1 : 0) +
    (inps.accessibility_count > 0 ? 1 : 0);
  if (signals >= 5) conf = "high";
  else if (signals >= 3) conf = "medium";

  return cat("response_accessibility", s, conf, reasons, {
    languages_count: inps.languages_count,
    intake_methods_count: inps.intake_methods_count,
    accepting_clients: inps.accepting_clients,
  });
}

function scoreAdvocateCompetency(inps: OrgScoringInputs): CategoryScoreDetail {
  let s = 28 + inps.profile_completeness_0_1 * 32;
  s += inps.routing_ratio_0_1 * 22;
  s += inps.completeness_ratio_0_1 * 18;
  if (inps.case_count_total < 3) {
    s *= 0.88;
  }
  s = clamp(s, 0, 100);
  const reasons: string[] = [
    `Profile completeness ~${Math.round(inps.profile_completeness_0_1 * 100)}%`,
    `${Math.round(inps.routing_ratio_0_1 * 100)}% of cases have a routing run`,
    `${Math.round(inps.completeness_ratio_0_1 * 100)}% of cases have a completeness run`,
  ];
  let conf: ScoreConfidence = "low";
  if (inps.case_count_total >= 10 && inps.routing_ratio_0_1 >= 0.25 && inps.completeness_ratio_0_1 >= 0.2)
    conf = "high";
  else if (inps.case_count_total >= 3 && (inps.routing_ratio_0_1 > 0 || inps.completeness_ratio_0_1 > 0))
    conf = "medium";
  return cat("advocate_competency", s, conf, reasons, {
    case_count_total: inps.case_count_total,
    routing_ratio: inps.routing_ratio_0_1,
  });
}

function scoreCaseOutcomesAccuracy(inps: OrgScoringInputs): CategoryScoreDetail {
  const r = inps.routing_ratio_0_1;
  const c = inps.completeness_ratio_0_1;
  const ocrPerCase =
    inps.case_count_total > 0 ? inps.ocr_runs_total / inps.case_count_total : 0;
  let s = 45 * r + 40 * c + clamp(ocrPerCase * 15, 0, 15);
  s = clamp(s, 0, 100);
  const reasons = [
    "Based on routing and completeness coverage across cases (workflow rigor proxy)",
    `OCR activity: ${inps.ocr_runs_total} run(s) vs ${inps.case_count_total} case(s)`,
  ];
  let conf: ScoreConfidence = "low";
  if (inps.case_count_total >= 10) conf = "high";
  else if (inps.case_count_total >= 3) conf = "medium";
  return cat("case_outcomes_accuracy", s, conf, reasons, {
    routing_ratio: r,
    completeness_ratio: c,
  });
}

function scoreVictimExperience(inps: OrgScoringInputs): CategoryScoreDetail {
  let s = 35;
  if (inps.case_messages_total > 0) {
    s += 15;
    s += Math.min(28, inps.advocate_messages_30d * 4);
  }
  if (inps.victim_messages_30d > 0 && inps.advocate_messages_30d > 0) s += 12;
  s = clamp(s, 0, 100);
  const reasons = [
    `Secure messaging: ${inps.case_messages_total} total message(s)`,
    `Last 30d — advocate-sent: ${inps.advocate_messages_30d}, survivor-sent: ${inps.victim_messages_30d}`,
  ];
  let conf: ScoreConfidence = "low";
  if (inps.advocate_messages_30d >= 5 && inps.victim_messages_30d >= 2) conf = "high";
  else if (inps.case_messages_total >= 5) conf = "medium";
  return cat("victim_experience", s, conf, reasons, {
    advocate_messages_30d: inps.advocate_messages_30d,
  });
}

function scoreOrgReliability(inps: OrgScoringInputs): CategoryScoreDetail {
  let s = 35;
  if (inps.profile_last_updated_days_ago != null && inps.profile_last_updated_days_ago < 90) {
    s += 28;
  }
  s += clamp(inps.case_count_90d * 3, 0, 37);
  s = clamp(s, 0, 100);
  const reasons: string[] = [];
  if (inps.profile_last_updated_days_ago != null) {
    reasons.push(`Profile last updated ~${inps.profile_last_updated_days_ago} day(s) ago`);
  } else {
    reasons.push("No profile update timestamp on file");
  }
  reasons.push(`${inps.case_count_90d} case(s) in the last 90 days`);
  let conf: ScoreConfidence = "low";
  if (inps.profile_last_updated_days_ago != null && inps.profile_last_updated_days_ago < 60 && inps.case_count_90d >= 2)
    conf = "high";
  else if (inps.profile_last_updated_days_ago != null || inps.case_count_90d >= 1) conf = "medium";
  return cat("org_reliability", s, conf, reasons, {
    case_count_90d: inps.case_count_90d,
  });
}

function scoreSystemIntegration(inps: OrgScoringInputs): CategoryScoreDetail {
  let s = 0;
  if (inps.case_messages_total >= 3) s += 28;
  if (inps.ocr_runs_total >= 1) s += 24;
  if (inps.routing_ratio_0_1 >= 0.15) s += 24;
  if (inps.completeness_ratio_0_1 >= 0.15) s += 24;
  s = clamp(s, 0, 100);
  const reasons = [
    "Messaging, OCR, routing, and completeness runs indicate structured workflow use",
  ];
  let conf: ScoreConfidence = "low";
  const hits =
    (inps.case_messages_total >= 3 ? 1 : 0) +
    (inps.ocr_runs_total >= 1 ? 1 : 0) +
    (inps.routing_ratio_0_1 >= 0.1 ? 1 : 0) +
    (inps.completeness_ratio_0_1 >= 0.1 ? 1 : 0);
  if (hits >= 3) conf = "high";
  else if (hits >= 2) conf = "medium";
  return cat("system_integration", s, conf, reasons, {
    ocr_runs_total: inps.ocr_runs_total,
  });
}

export function evaluateOrgQualityScoreFromInputs(inps: OrgScoringInputs): GradingEvaluationResult {
  const response_accessibility = scoreResponseAccessibility(inps);
  const advocate_competency = scoreAdvocateCompetency(inps);
  const case_outcomes_accuracy = scoreCaseOutcomesAccuracy(inps);
  const victim_experience = scoreVictimExperience(inps);
  const org_reliability = scoreOrgReliability(inps);
  const system_integration = scoreSystemIntegration(inps);

  const category_scores: Record<GradingCategoryKey, CategoryScoreDetail> = {
    response_accessibility,
    advocate_competency,
    case_outcomes_accuracy,
    victim_experience,
    org_reliability,
    system_integration,
  };

  let overall = 0;
  for (const d of Object.values(category_scores)) {
    overall += d.weighted_score;
  }
  overall = Math.round(clamp(overall, 0, 100) * 10) / 10;

  const categoryConfidences = {} as Record<GradingCategoryKey, ScoreConfidence>;
  for (const k of Object.keys(category_scores) as GradingCategoryKey[]) {
    categoryConfidences[k] = category_scores[k].confidence;
  }

  const score_confidence = aggregateOverallConfidence({
    categoryConfidences,
    inputs: inps,
  });

  const flags = buildGradingFlags({
    overallConfidence: score_confidence,
    inputs: inps,
    categoryConfidences,
  });

  const inputs_summary: Record<string, unknown> = {
    case_count_total: inps.case_count_total,
    case_count_90d: inps.case_count_90d,
    profile_completeness_0_1: inps.profile_completeness_0_1,
    routing_ratio: inps.routing_ratio_0_1,
    completeness_ratio: inps.completeness_ratio_0_1,
    case_messages_total: inps.case_messages_total,
    advocate_messages_30d: inps.advocate_messages_30d,
    ocr_runs_total: inps.ocr_runs_total,
    appointments_completed: inps.appointments_completed,
    appointments_tracked: inps.appointments_total_tracked,
  };

  return {
    overall_score: overall,
    score_confidence,
    category_scores,
    inputs_summary,
    flags,
  };
}

export { ORG_GRADING_VERSION };
