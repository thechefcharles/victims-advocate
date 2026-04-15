/**
 * Domain 6.1 — Canonical CBO scoring weights (Master System Document).
 *
 * Six categories, total 100%. A methodology row in score_methodologies may
 * override these, but the canonical defaults live here so any code path that
 * needs to compute or renormalize weights without a DB hit can do so safely.
 *
 * Matching-engine weights live in lib/server/matching/config.ts and are a
 * separate system (fit-based), not these scoring weights.
 */

export const CANONICAL_CATEGORY_WEIGHTS = {
  response_accessibility: 0.25,
  advocate_competency: 0.2,
  case_outcomes: 0.2,
  victim_experience: 0.15,
  org_reliability: 0.1,
  system_integration: 0.1,
} as const;

export type CategoryKey = keyof typeof CANONICAL_CATEGORY_WEIGHTS;

/**
 * Renormalize so the remaining categories sum to 1.0. A category is
 * "insufficient" when its score is null — typically because no aggregate
 * exists for it yet, or because the survey threshold (Category 4) is unmet.
 *
 * Example: victim_experience excluded (weight 0.15) →
 *   remaining sum = 0.85
 *   response_accessibility renormalized = 0.25 / 0.85 = 0.294
 *
 * Returns a new map; never mutates input.
 */
export function renormalizeWeights(
  baseWeights: Record<string, number>,
  categoryScores: Record<string, number | null>,
): Record<string, number> {
  const retained: Record<string, number> = {};
  for (const [key, weight] of Object.entries(baseWeights)) {
    const score = categoryScores[key];
    if (score !== null && score !== undefined && !Number.isNaN(Number(score))) {
      retained[key] = weight;
    }
  }

  const sum = Object.values(retained).reduce((a, b) => a + b, 0);
  if (sum <= 0) return {};

  const out: Record<string, number> = {};
  for (const [key, weight] of Object.entries(retained)) {
    out[key] = weight / sum;
  }
  return out;
}

/**
 * Compute the overall score as the weighted sum of per-category scores after
 * renormalization. Each category score is expected in the [0, 100] range;
 * output is in the same range. Returns null when no category has a score.
 */
export function computeOverallScore(
  categoryScores: Record<string, number | null>,
  baseWeights: Record<string, number> = CANONICAL_CATEGORY_WEIGHTS,
): number | null {
  const renorm = renormalizeWeights(baseWeights, categoryScores);
  const keys = Object.keys(renorm);
  if (keys.length === 0) return null;
  let total = 0;
  for (const key of keys) {
    total += (categoryScores[key] as number) * renorm[key];
  }
  return Math.round(total);
}

/**
 * Bucket a 0–100 overall score into the four public tier labels. Callers
 * must still check the confidence floor separately — a below-floor org is
 * always data_pending regardless of what overall score happens to be.
 */
export function deriveTier(
  overall: number | null,
  confidenceFloorMet: boolean,
): "comprehensive" | "established" | "developing" | "data_pending" {
  if (!confidenceFloorMet || overall === null) return "data_pending";
  if (overall >= 85) return "comprehensive";
  if (overall >= 65) return "established";
  return "developing";
}
