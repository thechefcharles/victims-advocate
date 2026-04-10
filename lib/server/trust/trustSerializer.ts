/**
 * Domain 6.1 — Trust serializers.
 *
 * Four completely separate output shapes — by design, with no shared base
 * type — so it is impossible to accidentally leak internal score data
 * through a public-facing surface.
 *
 *   serializeForPublic     — minimal: tier label + freshness, no highlights
 *   serializeForApplicant  — applicant-safe: tier + curated highlights
 *   serializeForProvider   — own-org internal: composite + category scores
 *   serializeForAgency     — comparative: tier + composite, no inputs
 *   serializeForAdmin      — full reproducibility: snapshot + inputs + methodology
 *
 * **Hard rule** — `weighted_composite`, `category_scores`, and
 * `provider_score_inputs` MUST NEVER appear in serializeForPublic or
 * serializeForApplicant output. Tests assert this with a string-search.
 */

import type {
  ProviderAffiliationStatus,
  ProviderReliabilitySummary,
  ProviderScoreInput,
  ProviderScoreSnapshot,
  ReliabilityTier,
  ScoreDispute,
  ScoreMethodology,
} from "./trustTypes";

// ---------------------------------------------------------------------------
// Public — minimal trust badge
// ---------------------------------------------------------------------------

export interface PublicReliabilityView {
  organizationId: string;
  reliabilityTier: ReliabilityTier;
  freshness: string;
}

export function serializeForPublic(
  summary: ProviderReliabilitySummary,
): PublicReliabilityView {
  return {
    organizationId: summary.organizationId,
    reliabilityTier: summary.reliabilityTier,
    freshness: summary.freshness,
  };
}

// ---------------------------------------------------------------------------
// Applicant-safe — tier + curated highlights
// ---------------------------------------------------------------------------

export interface ApplicantReliabilityView {
  organizationId: string;
  reliabilityTier: ReliabilityTier;
  highlights: string[];
  availabilitySummary: string | null;
  languageSummary: string | null;
  freshness: string;
}

export function serializeForApplicant(
  summary: ProviderReliabilitySummary,
): ApplicantReliabilityView {
  return {
    organizationId: summary.organizationId,
    reliabilityTier: summary.reliabilityTier,
    highlights: summary.highlights,
    availabilitySummary: summary.availabilitySummary,
    languageSummary: summary.languageSummary,
    freshness: summary.freshness,
  };
}

// ---------------------------------------------------------------------------
// Provider — own-org internal score view
// ---------------------------------------------------------------------------

export interface ProviderScoreView {
  snapshotId: string;
  organizationId: string;
  methodologyId: string;
  methodologyVersion: string;
  weightedComposite: number;
  categoryScores: Record<string, number>;
  scoreStatus: string;
  computedAt: string;
}

export function serializeForProvider(
  snapshot: ProviderScoreSnapshot,
): ProviderScoreView {
  return {
    snapshotId: snapshot.id,
    organizationId: snapshot.organizationId,
    methodologyId: snapshot.methodologyId,
    methodologyVersion: snapshot.methodologyVersion,
    weightedComposite: snapshot.weightedComposite,
    categoryScores: snapshot.categoryScores,
    scoreStatus: snapshot.scoreStatus,
    computedAt: snapshot.computedAt,
  };
}

// ---------------------------------------------------------------------------
// Agency — comparative oversight view
// ---------------------------------------------------------------------------

export interface AgencyComparativeView {
  organizationId: string;
  reliabilityTier: ReliabilityTier;
  weightedComposite: number;
  methodologyVersion: string;
  computedAt: string;
}

export function serializeForAgency(params: {
  snapshot: ProviderScoreSnapshot;
  summary: ProviderReliabilitySummary;
}): AgencyComparativeView {
  return {
    organizationId: params.snapshot.organizationId,
    reliabilityTier: params.summary.reliabilityTier,
    weightedComposite: params.snapshot.weightedComposite,
    methodologyVersion: params.snapshot.methodologyVersion,
    computedAt: params.snapshot.computedAt,
  };
}

// ---------------------------------------------------------------------------
// Admin — full reproducibility surface
// ---------------------------------------------------------------------------

export interface AdminTrustView {
  snapshot: ProviderScoreSnapshot;
  inputs: ProviderScoreInput[];
  summary: ProviderReliabilitySummary | null;
  methodology: ScoreMethodology;
}

export function serializeForAdmin(view: AdminTrustView): AdminTrustView {
  return view;
}

// ---------------------------------------------------------------------------
// Methodology / dispute / affiliation serializers
// ---------------------------------------------------------------------------

export function serializeMethodology(m: ScoreMethodology): ScoreMethodology {
  return m;
}

/**
 * Provider-facing dispute view. Excludes admin reviewer details until
 * the dispute is resolved.
 */
export interface ProviderDisputeView {
  id: string;
  status: string;
  reason: string;
  openedAt: string;
  resolutionOutcome: string | null;
}

export function serializeDisputeForProvider(
  dispute: ScoreDispute,
): ProviderDisputeView {
  return {
    id: dispute.id,
    status: dispute.status,
    reason: dispute.reason,
    openedAt: dispute.openedAt,
    resolutionOutcome: dispute.resolutionOutcome,
  };
}

export function serializeAffiliationForProvider(
  affiliation: ProviderAffiliationStatus,
): {
  organizationId: string;
  status: string;
  setAt: string;
} {
  return {
    organizationId: affiliation.organizationId,
    status: affiliation.status,
    setAt: affiliation.setAt,
  };
}

export function serializeAffiliationForAdmin(
  affiliation: ProviderAffiliationStatus,
): ProviderAffiliationStatus {
  return affiliation;
}
