/**
 * Domain 6.1 — Trust / Transparency / Scoring — canonical types.
 *
 * Data class: A — Restricted (admin/internal); applicant-safe surface only via
 * ProviderReliabilitySummary which strips internals before output.
 *
 * Pipeline contract:
 *   trust_signal_aggregates  (Domain 0.5 — read-only consumer)
 *     → ProviderScoreInput[]            (aggregateScoreInputs)
 *     → ProviderScoreSnapshot           (computeProviderScoreSnapshot)
 *     → ProviderReliabilitySummary      (mapToReliabilitySummary)
 *     → provider_search_index.reliability_tier (updateSearchTrustProjection)
 *
 * **Hard rules**:
 *   1. ProviderReliabilitySummary MUST be derived from a ProviderScoreSnapshot.
 *      No second scoring path. mapToReliabilitySummary() is the only producer.
 *   2. aggregateScoreInputs() reads from `trust_signal_aggregates` ONLY.
 *      It must NEVER query `cases`, `programs`, `cvc_applications`, or any
 *      raw workflow table.
 *   3. Only ONE `score_methodologies` row may have status='active' at a time
 *      (enforced by partial unique index in the migration).
 *   4. Snapshots are immutable history — recalculation creates a new row,
 *      it does not mutate existing snapshots (enforced by trigger).
 *   5. Public/applicant-facing surfaces NEVER expose `weighted_composite`,
 *      `category_scores`, or `provider_score_inputs` — only `reliability_tier`
 *      and curated `highlights`.
 */

// ---------------------------------------------------------------------------
// Status enums (canonical for Domain 6.1 — supersede registry stubs)
// ---------------------------------------------------------------------------

export const SCORE_METHODOLOGY_STATUSES = ["draft", "active", "deprecated"] as const;
export type ScoreMethodologyStatus = (typeof SCORE_METHODOLOGY_STATUSES)[number];

export const SCORE_DISPUTE_STATUSES = [
  "open",
  "under_review",
  "resolved",
  "closed",
] as const;
export type ScoreDisputeStatus = (typeof SCORE_DISPUTE_STATUSES)[number];

export const SCORE_DISPUTE_OUTCOMES = [
  "affirmed",
  "recomputed",
  "declined",
] as const;
export type ScoreDisputeOutcome = (typeof SCORE_DISPUTE_OUTCOMES)[number];

export const PROVIDER_AFFILIATION_STATUSES = [
  "pending_review",
  "affiliated",
  "not_affiliated",
  "suspended",
] as const;
export type ProviderAffiliationStatusType =
  (typeof PROVIDER_AFFILIATION_STATUSES)[number];

export const RELIABILITY_TIERS = [
  "verified",
  "established",
  "emerging",
  "unverified",
] as const;
export type ReliabilityTier = (typeof RELIABILITY_TIERS)[number];

export const SCORE_SNAPSHOT_STATUSES = [
  "computed",
  "insufficient_data",
  "error",
] as const;
export type ScoreSnapshotStatus = (typeof SCORE_SNAPSHOT_STATUSES)[number];

// ---------------------------------------------------------------------------
// Methodology
// ---------------------------------------------------------------------------

/**
 * The governed scoring model. Versioned and audited. Only one active at a time.
 * Category definitions describe what each input maps to; weights describe how
 * categories combine into the weighted composite.
 */
export interface ScoreMethodology {
  id: string;
  version: string;
  name: string;
  description: string | null;
  status: ScoreMethodologyStatus;
  /** Ordered list of category definitions. Each entry: { key, label, signalTypes[] }. */
  categoryDefinitions: ScoreMethodologyCategory[];
  /** Map of categoryKey → weight (0..1). Sum should be ~1.0 but not enforced. */
  weights: Record<string, number>;
  createdByUserId: string | null;
  publishedAt: string | null;
  deprecatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreMethodologyCategory {
  key: string;
  label: string;
  /** trust_signal_aggregates.signal_type values that feed this category. */
  signalTypes: string[];
}

// ---------------------------------------------------------------------------
// Score input — normalized signal contribution to a snapshot
// ---------------------------------------------------------------------------

/**
 * One row per (snapshot, signal). Records the raw aggregate value and the
 * normalized + weighted contribution that flowed into the composite.
 *
 * `source` is always 'trust_signal_aggregates' in v1; the column exists so a
 * future migration to a multi-source model doesn't require schema churn.
 */
export interface ProviderScoreInput {
  id: string;
  snapshotId: string;
  organizationId: string;
  category: string;
  signalType: string;
  rawValue: number;
  normalizedValue: number;
  weight: number;
  contribution: number;
  source: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Score snapshot — immutable versioned snapshot
// ---------------------------------------------------------------------------

export interface ProviderScoreSnapshot {
  id: string;
  organizationId: string;
  methodologyId: string;
  /** Denormalized methodology version for fast historical queries. */
  methodologyVersion: string;
  /** Per-category sub-scores: { [categoryKey]: number }. */
  categoryScores: Record<string, number>;
  weightedComposite: number;
  scoreStatus: ScoreSnapshotStatus;
  /** Reproducibility metadata: window range, input counts, computation time. */
  calcMetadata: Record<string, unknown>;
  computedAt: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Reliability summary — applicant-safe derived view
// ---------------------------------------------------------------------------

/**
 * Derived ENTIRELY from a ProviderScoreSnapshot via mapToReliabilitySummary().
 * Never recomputed from raw signals or aggregates — that would create a
 * second scoring path.
 *
 * Public/applicant fields only: tier + curated highlights + soft availability
 * + freshness. NEVER includes weightedComposite, categoryScores, or inputs.
 */
export interface ProviderReliabilitySummary {
  id: string;
  organizationId: string;
  snapshotId: string;
  reliabilityTier: ReliabilityTier;
  highlights: string[];
  availabilitySummary: string | null;
  languageSummary: string | null;
  freshness: string;
  isCurrent: boolean;
  computedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Dispute
// ---------------------------------------------------------------------------

export interface ScoreDispute {
  id: string;
  organizationId: string;
  snapshotId: string;
  status: ScoreDisputeStatus;
  reason: string;
  evidence: Record<string, unknown>;
  openedByUserId: string;
  openedAt: string;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  resolutionNotes: string | null;
  resolutionOutcome: ScoreDisputeOutcome | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Affiliation
// ---------------------------------------------------------------------------

export interface ProviderAffiliationStatus {
  id: string;
  organizationId: string;
  status: ProviderAffiliationStatusType;
  reason: string | null;
  notes: string | null;
  setByUserId: string;
  setAt: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Transparency indicators — surfaced per visibility layer
// ---------------------------------------------------------------------------

/**
 * Lightweight badge/indicator that can be shown on different surfaces with
 * scoped detail. Each indicator has a layer that controls what's visible.
 */
export interface TransparencyIndicator {
  key: string;
  label: string;
  layer: "public" | "applicant" | "provider" | "agency" | "admin";
  value: string | number | boolean | null;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Date range — used by the score pipeline for windowing
// ---------------------------------------------------------------------------

export interface DateRange {
  startAt: string;
  endAt: string;
}
