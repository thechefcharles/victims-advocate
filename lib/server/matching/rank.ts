/**
 * Phase B: Sort match results (deterministic).
 */

import type { MatchEvaluation } from "./types";

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
