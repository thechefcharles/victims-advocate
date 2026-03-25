/**
 * Phase B: Score a single org against matching input (after hard filters pass).
 */

import type { MatchingInput, MatchEvaluation, OrgRowForMatching } from "./types";
import { MATCHING_SCORE_WEIGHTS, MATCHING_THRESHOLDS } from "./config";
import { orgProfileCompleteness, stateInCoverage } from "./filters";
import {
  buildAccessibilityReasons,
  buildCapacityReasons,
  buildCoverageUnclearFlag,
  buildGeographyReason as buildGeographyReasons,
  buildLanguageReasons,
  buildProfileIncompleteFlag,
  buildServiceReasons,
  buildSparseIntakeFlag,
  buildSpecialPopulationReasons,
} from "./reasons";

function serviceOverlap(org: OrgRowForMatching, needed: string[]): string[] {
  const orgSet = new Set((org.service_types || []).map((s) => s.toLowerCase()));
  return needed.filter((n) => orgSet.has(n.toLowerCase()));
}

function scoreCapacity(org: OrgRowForMatching): number {
  if (org.accepting_clients && org.capacity_status === "open") {
    return MATCHING_SCORE_WEIGHTS.capacity_open_accepting;
  }
  if (org.accepting_clients) return MATCHING_SCORE_WEIGHTS.capacity_accepting;
  if (org.capacity_status === "open") return MATCHING_SCORE_WEIGHTS.capacity_open_only;
  if (org.capacity_status === "limited") return MATCHING_SCORE_WEIGHTS.capacity_limited;
  if (org.capacity_status === "waitlist") return MATCHING_SCORE_WEIGHTS.capacity_waitlist;
  return MATCHING_SCORE_WEIGHTS.capacity_other;
}

function scoreResponse(org: OrgRowForMatching): number {
  const h = org.avg_response_time_hours;
  if (h == null) return MATCHING_SCORE_WEIGHTS.response_slow_or_unknown;
  if (h <= 24) return MATCHING_SCORE_WEIGHTS.response_fast_24h;
  if (h <= 72) return MATCHING_SCORE_WEIGHTS.response_72h;
  if (h <= 168) return MATCHING_SCORE_WEIGHTS.response_week;
  return MATCHING_SCORE_WEIGHTS.response_slow_or_unknown;
}

export type EvaluateContext = {
  geo_excluded_but_virtual: boolean;
};

export function evaluateOrgMatch(
  org: OrgRowForMatching,
  input: MatchingInput,
  ctx: EvaluateContext
): MatchEvaluation {
  const overlap = serviceOverlap(org, input.service_types_needed);
  const serviceNeedCount = Math.max(1, input.service_types_needed.length);
  const serviceOverlapRatio = overlap.length / serviceNeedCount;
  const serviceScore = Math.min(
    MATCHING_SCORE_WEIGHTS.service_overlap_cap,
    overlap.length * MATCHING_SCORE_WEIGHTS.service_overlap_each
  );

  const { inArea, defined } = stateInCoverage(org.coverage_area || {}, input.state_code);
  let geoScore = 0;
  if (ctx.geo_excluded_but_virtual) {
    geoScore = MATCHING_SCORE_WEIGHTS.coverage_virtual_fallback;
  } else if (input.state_code && defined && inArea) {
    geoScore = MATCHING_SCORE_WEIGHTS.coverage_state_match;
  } else if (!defined) {
    geoScore = MATCHING_SCORE_WEIGHTS.coverage_unknown;
  } else {
    geoScore = 0;
  }

  const capScore = scoreCapacity(org);
  const lang = buildLanguageReasons(org, input.preferred_language);
  const langScore = lang.match
    ? MATCHING_SCORE_WEIGHTS.language_match
    : lang.unknown
      ? MATCHING_SCORE_WEIGHTS.language_unknown
      : MATCHING_SCORE_WEIGHTS.language_non_match;

  const acc = buildAccessibilityReasons(org, input.needs_accessibility_features);
  const accScore = Math.min(
    MATCHING_SCORE_WEIGHTS.accessibility_cap,
    acc.matched.length * MATCHING_SCORE_WEIGHTS.accessibility_each
  );

  const specReasons = buildSpecialPopulationReasons(org, input.special_population_flags);
  const specScore = Math.min(
    MATCHING_SCORE_WEIGHTS.special_population_cap,
    specReasons.length * MATCHING_SCORE_WEIGHTS.special_population_each
  );

  const respScore = scoreResponse(org);

  const raw =
    serviceScore +
    geoScore +
    capScore +
    langScore +
    accScore +
    specScore +
    respScore;
  const match_score = Math.min(100, Math.round(raw));

  const completeness = orgProfileCompleteness(org);
  const geoReasons = buildGeographyReasons({
    stateMatch: Boolean(input.state_code && defined && inArea),
    viaVirtual: ctx.geo_excluded_but_virtual,
    stateKnown: Boolean(input.state_code),
  });
  const capR = buildCapacityReasons(org);
  const reasons = [
    ...buildServiceReasons(overlap),
    ...geoReasons,
    ...capR.reasons,
    ...lang.reasons,
    ...acc.reasons,
    ...specReasons,
  ];
  const flags: string[] = [];
  if (lang.unknown && input.preferred_language) {
    flags.push("Language match is unknown");
  }
  const covFlag = buildCoverageUnclearFlag(defined);
  if (covFlag) flags.push(covFlag);
  const profFlag = buildProfileIncompleteFlag(completeness);
  if (profFlag) flags.push(profFlag);
  const sparse = buildSparseIntakeFlag(input);
  if (sparse) flags.push(sparse);
  if (input.service_types_needed.length === 0) {
    flags.push("Service needs are limited — recommendations use broader fit signals");
  }

  // Service fit must remain the dominant ranking factor.
  if (
    input.service_types_needed.length > 0 &&
    serviceOverlapRatio < MATCHING_THRESHOLDS.weak_service_overlap_ratio
  ) {
    flags.push("Service overlap is limited for your current needs");
  }

  let match_tier: MatchEvaluation["match_tier"];
  let strong_match = false;
  let possible_match = false;
  let limited_match = false;

  if (
    completeness < MATCHING_THRESHOLDS.limited_profile_completeness ||
    match_score < MATCHING_THRESHOLDS.possible_min_score
  ) {
    match_tier = "limited_match";
    limited_match = true;
  } else if (
    match_score >= MATCHING_THRESHOLDS.strong_min_score &&
    completeness >= MATCHING_THRESHOLDS.strong_min_completeness &&
    (input.service_types_needed.length === 0 || overlap.length > 0)
  ) {
    match_tier = "strong_match";
    strong_match = true;
  } else {
    match_tier = "possible_match";
    possible_match = true;
  }

  if (input.intake_sparse && match_tier === "strong_match") {
    match_tier = "possible_match";
    strong_match = false;
    possible_match = true;
    flags.push("Recommendations based on limited intake details");
  }

  if (
    input.intake_sparse &&
    !flags.includes("More information in your application may improve recommendations")
  ) {
    flags.push("More information in your application may improve recommendations");
  }

  return {
    organization_id: org.id,
    organization_name: org.name,
    match_score,
    fit_match_score: match_score,
    match_tier,
    strong_match,
    possible_match,
    limited_match,
    reasons,
    flags,
    service_overlap: overlap,
    language_match: lang.match,
    accessibility_match: acc.matched,
    capacity_signal: capR.signal,
    virtual_ok: ctx.geo_excluded_but_virtual ? true : null,
    profile_completeness_score: completeness,
    designation_tier: null,
    designation_confidence: null,
    designation_summary: null,
    designation_influenced_match: false,
    designation_reason: null,
    designation_boost_points: 0,
    designation_tie_ordinal: 0,
    score_breakdown: {
      service: serviceScore,
      coverage: geoScore,
      availability: capScore,
      language: langScore,
      accessibility: accScore,
      special_populations: specScore,
      response_time: respScore,
    },
  };
}
