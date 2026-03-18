/**
 * Phase B + F: Sort match results (deterministic). Designation tie-break only when fits are close.
 */

import type { MatchEvaluation } from "./types";
import { DESIGNATION_TIE_BREAK_FIT_SCORE_BAND } from "./config";

export function rankMatches(results: MatchEvaluation[]): MatchEvaluation[] {
  const tierOrder = { strong_match: 0, possible_match: 1, limited_match: 2 };
  return [...results].sort((a, b) => {
    const ta = tierOrder[a.match_tier];
    const tb = tierOrder[b.match_tier];
    if (ta !== tb) return ta - tb;
    if (b.match_score !== a.match_score) return b.match_score - a.match_score;
    return a.organization_name.localeCompare(b.organization_name);
  });
}

export function rankMatchesWithDesignation(results: MatchEvaluation[]): MatchEvaluation[] {
  const tierOrder = { strong_match: 0, possible_match: 1, limited_match: 2 };
  const band = DESIGNATION_TIE_BREAK_FIT_SCORE_BAND;

  return [...results].sort((a, b) => {
    const ta = tierOrder[a.match_tier];
    const tb = tierOrder[b.match_tier];
    if (ta !== tb) return ta - tb;
    if (b.match_score !== a.match_score) return b.match_score - a.match_score;
    const fitDiff = Math.abs(a.fit_match_score - b.fit_match_score);
    if (fitDiff <= band) {
      const ord = (b.designation_tie_ordinal ?? 0) - (a.designation_tie_ordinal ?? 0);
      if (ord !== 0) return ord;
    }
    return a.organization_name.localeCompare(b.organization_name);
  });
}
