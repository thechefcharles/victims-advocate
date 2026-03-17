/**
 * Phase B: Score a single org against matching input (after hard filters pass).
 */

import type { MatchingInput, MatchEvaluation, OrgRowForMatching } from "./types";
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
  if (org.accepting_clients && org.capacity_status === "open") return 18;
  if (org.accepting_clients) return 14;
  if (org.capacity_status === "open") return 12;
  if (org.capacity_status === "limited") return 8;
  if (org.capacity_status === "waitlist") return 5;
  return 4;
}

function scoreResponse(org: OrgRowForMatching): number {
  const h = org.avg_response_time_hours;
  if (h == null) return 3;
  if (h <= 24) return 8;
  if (h <= 72) return 6;
  if (h <= 168) return 4;
  return 2;
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
  const serviceScore = Math.min(42, overlap.length * 14);

  const { inArea, defined } = stateInCoverage(org.coverage_area || {}, input.state_code);
  let geoScore = 0;
  if (ctx.geo_excluded_but_virtual) {
    geoScore = 22;
  } else if (input.state_code && defined && inArea) {
    geoScore = 26;
  } else if (!defined) {
    geoScore = 8;
  } else {
    geoScore = 10;
  }

  const capScore = scoreCapacity(org);
  const lang = buildLanguageReasons(org, input.preferred_language);
  const langScore = lang.match ? 12 : lang.unknown ? 2 : 4;

  const acc = buildAccessibilityReasons(org, input.needs_accessibility_features);
  const accScore = Math.min(12, acc.matched.length * 6 + (acc.reasons.length > 0 ? 2 : 0));

  const specReasons = buildSpecialPopulationReasons(org, input.special_population_flags);
  const specScore = Math.min(12, specReasons.length * 5);

  const respScore = scoreResponse(org);

  let raw =
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
    flags.push("Language match unknown — confirm directly");
  }
  const covFlag = buildCoverageUnclearFlag(defined);
  if (covFlag) flags.push(covFlag);
  const profFlag = buildProfileIncompleteFlag(completeness);
  if (profFlag) flags.push(profFlag);
  const sparse = buildSparseIntakeFlag(input);
  if (sparse) flags.push(sparse);

  let match_tier: MatchEvaluation["match_tier"];
  let strong_match = false;
  let possible_match = false;
  let limited_match = false;

  if (completeness < 0.32 || match_score < 32) {
    match_tier = "limited_match";
    limited_match = true;
  } else if (match_score >= 68 && completeness >= 0.4) {
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
  };
}
