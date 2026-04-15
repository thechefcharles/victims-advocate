/**
 * Domain 6.1 — Provider score service.
 *
 * The canonical scoring pipeline. This is the ONLY producer of
 * ProviderScoreSnapshot and the ONLY caller that writes
 * `provider_search_index.reliability_tier`.
 *
 * Pipeline:
 *   1. aggregateScoreInputs(orgId, methodology)
 *      → reads `trust_signal_aggregates` (Search Law: this table only)
 *      → maps each signal_type to a methodology category
 *      → returns ProviderScoreInput[] with normalized + weighted contributions
 *
 *   2. computeProviderScoreSnapshot(orgId, methodology, inputs)
 *      → sums contributions per category
 *      → computes the weighted composite from category scores × weights
 *      → inserts an immutable snapshot row
 *      → inserts the input rows linked to the snapshot
 *      → returns the new ProviderScoreSnapshot
 *
 *   3. mapToReliabilitySummary(snapshot)
 *      → derives ReliabilityTier from weighted_composite ONLY
 *      → composes human-readable highlights from categoryScores
 *      → upserts the current row in provider_reliability_summaries
 *      → NEVER reads aggregates or inputs — single derivation path
 *
 *   4. updateSearchTrustProjection(orgId, tier)
 *      → writes provider_search_index.reliability_tier
 *
 * recalculateProviderScore(orgId) is the public entrypoint that runs all
 * four steps in sequence.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type {
  DateRange,
  ProviderReliabilitySummary,
  ProviderScoreInput,
  ProviderScoreSnapshot,
  ReliabilityTier,
  ScoreMethodology,
} from "./trustTypes";
import {
  getActiveMethodology,
  getTrustSignalAggregates,
  insertReliabilitySummary,
  insertScoreInputs,
  insertSnapshot,
  updateSearchIndexReliabilityTier,
} from "./trustRepository";
import { getSurveyAggregate } from "@/lib/server/surveys";

/**
 * Category key convention for the survey-powered victim experience category.
 * Only applied when the active methodology declares a category with this key.
 */
const VICTIM_EXPERIENCE_CATEGORY_KEY = "victim_experience";

// ---------------------------------------------------------------------------
// Tier thresholds (deterministic, methodology-agnostic in v1)
// ---------------------------------------------------------------------------

/**
 * Tier thresholds against the weighted composite.
 * v1 uses fixed buckets — a future iteration can move these into the
 * methodology row so each version can tune its own bands.
 */
const TIER_THRESHOLDS: { tier: ReliabilityTier; min: number }[] = [
  { tier: "verified", min: 0.85 },
  { tier: "established", min: 0.65 },
  { tier: "emerging", min: 0.4 },
  { tier: "unverified", min: 0 },
];

function deriveTier(weightedComposite: number): ReliabilityTier {
  for (const band of TIER_THRESHOLDS) {
    if (weightedComposite >= band.min) return band.tier;
  }
  return "unverified";
}

// ---------------------------------------------------------------------------
// 1. aggregateScoreInputs
// ---------------------------------------------------------------------------

/**
 * Reads `trust_signal_aggregates` for an organization and maps each signal
 * to a methodology category, producing the per-input contributions that
 * will feed `computeProviderScoreSnapshot`.
 *
 * **MUST READ ONLY trust_signal_aggregates** — never `cases`, `programs`,
 * `cvc_applications`, or any raw workflow table. This is enforced by the
 * fact that this function only calls `getTrustSignalAggregates` from the
 * repository, which itself reads only that one table.
 */
export async function aggregateScoreInputs(
  organizationId: string,
  methodology: ScoreMethodology,
  supabase: SupabaseClient = getSupabaseAdmin(),
  _window?: DateRange,
): Promise<Omit<ProviderScoreInput, "id" | "snapshotId" | "createdAt">[]> {
  const aggregates = await getTrustSignalAggregates(organizationId, supabase);
  const aggregateBySignal = new Map(aggregates.map((a) => [a.signalType, a]));

  const inputs: Omit<ProviderScoreInput, "id" | "snapshotId" | "createdAt">[] = [];

  for (const category of methodology.categoryDefinitions) {
    const categoryWeight = methodology.weights[category.key] ?? 0;
    if (categoryWeight === 0) continue;

    const perSignalWeight =
      category.signalTypes.length > 0
        ? categoryWeight / category.signalTypes.length
        : 0;

    for (const signalType of category.signalTypes) {
      const agg = aggregateBySignal.get(signalType);
      const rawValue = agg?.totalValue ?? 0;
      const totalCount = agg?.totalCount ?? 0;
      const normalized = normalizeSignalValue(rawValue, totalCount);
      const contribution = normalized * perSignalWeight;
      inputs.push({
        organizationId,
        category: category.key,
        signalType,
        rawValue,
        normalizedValue: normalized,
        weight: perSignalWeight,
        contribution,
        source: "trust_signal_aggregates",
      });
    }
  }
  return inputs;
}

/**
 * Normalizes a raw signal value into [0, 1]. v1 uses a saturating curve
 * over the count + value pair so small but established providers don't get
 * inflated by single high-value events.
 *
 * normalized = totalCount > 0 ? min(1, log10(totalCount + 1) / log10(11)) : 0
 *
 * The reference cap is 10 events ⇒ normalized = 1.0. Above 10 stays at 1.
 */
function normalizeSignalValue(_rawValue: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  const denom = Math.log10(11);
  const num = Math.log10(totalCount + 1);
  return Math.min(1, num / denom);
}

// ---------------------------------------------------------------------------
// 2. computeProviderScoreSnapshot
// ---------------------------------------------------------------------------

export async function computeProviderScoreSnapshot(params: {
  organizationId: string;
  methodology: ScoreMethodology;
  inputs: Omit<ProviderScoreInput, "id" | "snapshotId" | "createdAt">[];
  supabase?: SupabaseClient;
}): Promise<ProviderScoreSnapshot> {
  const supabase = params.supabase ?? getSupabaseAdmin();

  // Sum contributions per category.
  const categoryScores: Record<string, number> = {};
  for (const input of params.inputs) {
    categoryScores[input.category] = (categoryScores[input.category] ?? 0) + input.contribution;
  }

  // Weighted composite is the sum of all contributions (since each
  // contribution is already weighted at the per-signal level).
  let weightedComposite = 0;
  for (const value of Object.values(categoryScores)) {
    weightedComposite += value;
  }
  // Clamp to [0, 1] for safety.
  weightedComposite = Math.max(0, Math.min(1, weightedComposite));

  const status = params.inputs.length === 0 ? "insufficient_data" : "computed";

  const snapshot = await insertSnapshot(
    {
      organizationId: params.organizationId,
      methodologyId: params.methodology.id,
      methodologyVersion: params.methodology.version,
      categoryScores,
      weightedComposite,
      scoreStatus: status,
      calcMetadata: {
        input_count: params.inputs.length,
        category_count: Object.keys(categoryScores).length,
        computed_by: "providerScoreService.computeProviderScoreSnapshot",
        computed_at: new Date().toISOString(),
      },
    },
    supabase,
  );

  // Persist the inputs linked to this snapshot.
  if (params.inputs.length > 0) {
    await insertScoreInputs(
      params.inputs.map((i) => ({ ...i, snapshotId: snapshot.id })),
      supabase,
    );
  }

  return snapshot;
}

// ---------------------------------------------------------------------------
// 3. mapToReliabilitySummary
// ---------------------------------------------------------------------------

/**
 * Derives a ProviderReliabilitySummary from a ProviderScoreSnapshot.
 *
 * **No second scoring path** — this function reads ONLY from the snapshot
 * argument. It does not call `getTrustSignalAggregates` or
 * `aggregateScoreInputs`. Any future change that introduces a second
 * derivation path violates the architecture and must be rejected in review.
 */
export async function mapToReliabilitySummary(
  snapshot: ProviderScoreSnapshot,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ProviderReliabilitySummary> {
  const tier = deriveTier(snapshot.weightedComposite);
  const highlights = composeHighlights(snapshot);

  return insertReliabilitySummary(
    {
      organizationId: snapshot.organizationId,
      snapshotId: snapshot.id,
      reliabilityTier: tier,
      highlights,
      availabilitySummary: null,
      languageSummary: null,
    },
    supabase,
  );
}

/**
 * Composes 0-3 human-readable highlights from category scores. Pure function
 * over the snapshot; does not query the database.
 */
function composeHighlights(snapshot: ProviderScoreSnapshot): string[] {
  const entries = Object.entries(snapshot.categoryScores);
  if (entries.length === 0) return [];
  // Sort by category score desc and take the top 3.
  const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, 3);
  return sorted
    .filter(([, value]) => value > 0)
    .map(([category, value]) => {
      const pct = Math.round(value * 100);
      return `Strong ${category.replace(/_/g, " ")} signals (${pct}%).`;
    });
}

// ---------------------------------------------------------------------------
// 4. updateSearchTrustProjection
// ---------------------------------------------------------------------------

export async function updateSearchTrustProjection(
  organizationId: string,
  tier: ReliabilityTier,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<void> {
  await updateSearchIndexReliabilityTier(organizationId, tier, supabase);
}

// ---------------------------------------------------------------------------
// Public entrypoint — full pipeline
// ---------------------------------------------------------------------------

/**
 * Runs the full scoring pipeline for an organization. Creates a NEW snapshot;
 * does not mutate prior history. The active methodology is required.
 */
export async function recalculateProviderScore(params: {
  organizationId: string;
  supabase?: SupabaseClient;
}): Promise<{
  snapshot: ProviderScoreSnapshot;
  summary: ProviderReliabilitySummary;
}> {
  const supabase = params.supabase ?? getSupabaseAdmin();

  const methodology = await getActiveMethodology(supabase);
  if (!methodology) {
    throw new AppError(
      "VALIDATION_ERROR",
      "No active scoring methodology — cannot compute snapshot.",
      undefined,
      422,
    );
  }

  let inputs = await aggregateScoreInputs(params.organizationId, methodology, supabase);

  // Category 4 — Victim Experience survey integration. Only active when the
  // methodology declares a `victim_experience` category. Backwards compatible:
  // methodologies without that category are unaffected.
  const victimCategory = methodology.categoryDefinitions.find(
    (c) => c.key === VICTIM_EXPERIENCE_CATEGORY_KEY,
  );
  if (victimCategory) {
    const categoryWeight = methodology.weights[victimCategory.key] ?? 0;
    // Drop any existing victim_experience inputs from the signal pipeline —
    // survey data supersedes aggregate-table derivations for this category.
    inputs = inputs.filter((i) => i.category !== victimCategory.key);

    const survey = await getSurveyAggregate(params.organizationId, supabase);
    if (survey.meetsThreshold && survey.averages && categoryWeight > 0) {
      // Normalize 1–5 Likert scale to 0–1: (avg - 1) / 4.
      const avgAll =
        (survey.averages.feltHeard +
          survey.averages.advocateClarity +
          survey.averages.feltSafe +
          survey.averages.rightsExplained +
          survey.averages.likelihoodToRecommend) /
        5;
      const normalized = Math.max(0, Math.min(1, (avgAll - 1) / 4));
      inputs.push({
        organizationId: params.organizationId,
        category: victimCategory.key,
        signalType: "survey.victim_experience",
        rawValue: avgAll,
        normalizedValue: normalized,
        weight: categoryWeight,
        contribution: normalized * categoryWeight,
        source: "org_survey_responses",
      });
    } else if (categoryWeight > 0 && categoryWeight < 1) {
      // Below-threshold: renormalize remaining category contributions so the
      // remaining weights sum to 1 (100%). Example: if victim_experience was
      // 0.15, scale all others by 1/0.85.
      const renormScale = 1 / (1 - categoryWeight);
      inputs = inputs.map((i) => ({
        ...i,
        weight: i.weight * renormScale,
        contribution: i.contribution * renormScale,
      }));
    }
  }

  const snapshot = await computeProviderScoreSnapshot({
    organizationId: params.organizationId,
    methodology,
    inputs,
    supabase,
  });
  const summary = await mapToReliabilitySummary(snapshot, supabase);
  await updateSearchTrustProjection(
    params.organizationId,
    summary.reliabilityTier,
    supabase,
  );
  return { snapshot, summary };
}
