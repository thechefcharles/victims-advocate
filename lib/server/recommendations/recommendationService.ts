/**
 * Domain 5.2 — Recommendations service.
 *
 * Orchestrates the three-phase recommendation pipeline:
 *   1. buildRecommendationContext(actor) — assembles location + intake signals
 *   2. fetchCandidateResources(context)  — queries provider_search_index
 *   3. rankRecommendations → map to RecommendationItem → RecommendationSet
 *
 * Read-only domain. This module never writes to intake, case, or program
 * tables. The only optional write target is the recommendation_cache table
 * via recommendationRepository (deferred in v1 — cache is opt-in).
 */

import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";
import type {
  CandidateResource,
  RecommendationCategory,
  RecommendationContext,
  RecommendationItem,
  RecommendationPriority,
  RecommendationReason,
  RecommendationSet,
} from "./recommendationTypes";
import {
  fetchCandidateResources,
  rankRecommendations,
  inferCategory,
} from "./recommendationEngine";

// ---------------------------------------------------------------------------
// Context assembly
// ---------------------------------------------------------------------------

/**
 * Assembles a RecommendationContext for the given actor by reading location
 * and intake-signal inputs from their own profile. Failing reads degrade
 * gracefully (empty context is legal — engine falls back to generic top picks).
 *
 * This function is intentionally tolerant: a brand-new applicant with no
 * profile and no intake should still get a usable recommendation set.
 */
export async function buildRecommendationContext(
  actor: PolicyActor,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<RecommendationContext> {
  const ctx: RecommendationContext = {
    userId: actor.userId,
    accountType: actor.accountType,
    location: {
      stateCode: null,
      lat: null,
      lng: null,
    },
    intakeSignals: {
      serviceTags: [],
      categories: [],
      preferredLanguage: null,
    },
    caseId: null,
    workflowState: null,
    excludedProviderIds: [],
  };

  // Applicant location from applicant_profiles.state
  if (actor.accountType === "applicant") {
    try {
      const { data: profile } = await supabase
        .from("applicant_profiles")
        .select("state")
        .eq("user_id", actor.userId)
        .maybeSingle();
      if (profile && typeof profile.state === "string" && profile.state.length > 0) {
        ctx.location.stateCode = profile.state.toUpperCase();
      }
    } catch {
      // Tolerate profile miss — context stays empty.
    }

    // Latest intake submission — categories and preferred language
    try {
      const { data: intake } = await supabase
        .from("intake_submissions")
        .select("normalized_payload, preferred_language")
        .eq("applicant_user_id", actor.userId)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (intake) {
        const payload = (intake.normalized_payload ?? {}) as Record<string, unknown>;
        const needCategories = Array.isArray(payload.service_categories)
          ? (payload.service_categories as string[])
          : [];
        ctx.intakeSignals.categories = needCategories.filter(isRecommendationCategory);
        ctx.intakeSignals.serviceTags = Array.isArray(payload.service_tags)
          ? (payload.service_tags as string[])
          : [];
        if (typeof intake.preferred_language === "string") {
          ctx.intakeSignals.preferredLanguage = intake.preferred_language;
        }
      }
    } catch {
      // Tolerate intake miss — engine degrades to generic top picks.
    }

    // Most recent active case — workflow state shifts case-stage relevance
    try {
      const { data: activeCase } = await supabase
        .from("cases")
        .select("id, status")
        .eq("applicant_user_id", actor.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (activeCase) {
        ctx.caseId = String(activeCase.id);
        ctx.workflowState = activeCase.status ? String(activeCase.status) : null;
      }
    } catch {
      // Non-fatal.
    }
  }

  return ctx;
}

function isRecommendationCategory(value: string): value is RecommendationCategory {
  return (
    value === "legal" ||
    value === "housing" ||
    value === "crisis" ||
    value === "counseling" ||
    value === "financial" ||
    value === "medical" ||
    value === "advocacy" ||
    value === "immigration" ||
    value === "general"
  );
}

// ---------------------------------------------------------------------------
// Item shaping — candidate → RecommendationItem
// ---------------------------------------------------------------------------

/**
 * Builds a RecommendationItem from a ranked CandidateResource. This is
 * the single place where reasonCode and actionLabel are chosen, so the
 * rules stay centralized and testable.
 */
export function candidateToItem(
  cand: CandidateResource,
  context: RecommendationContext,
  rankIndex: number,
): RecommendationItem {
  const { reasonCode, reason } = chooseReason(cand, context);
  const priority: RecommendationPriority =
    rankIndex < 3 ? "high" : rankIndex < 8 ? "medium" : "low";

  return {
    resourceId: cand.organizationId,
    resourceType: "organization",
    title: cand.name,
    description: cand.description,
    reason,
    reasonCode,
    priority,
    category: inferCategory(cand),
    actionLabel: cand.acceptingClients ? "Get help" : "Learn more",
    distanceMiles: cand.distanceMiles,
    reliabilityTier: cand.reliabilityTier,
  };
}

/**
 * Decides the reason for a candidate. Order of precedence mirrors the
 * rank ordering so the human-visible reason agrees with why the item is here.
 */
function chooseReason(
  cand: CandidateResource,
  context: RecommendationContext,
): { reasonCode: RecommendationReason; reason: string } {
  if (cand.reliabilityTier === "verified") {
    return {
      reasonCode: "high_trust",
      reason: "This provider is on the verified trust tier.",
    };
  }
  if (cand.matchedTags.length > 0 && context.intakeSignals.categories.length > 0) {
    return {
      reasonCode: "intake_need_match",
      reason: `Matches services you said you needed: ${cand.matchedTags
        .slice(0, 3)
        .map((t) => t.replace(/_/g, " "))
        .join(", ")}.`,
    };
  }
  if (
    cand.distanceMiles != null &&
    cand.distanceMiles >= 0 &&
    cand.distanceMiles <= 25
  ) {
    return {
      reasonCode: "location_match",
      reason: `About ${Math.round(cand.distanceMiles)} miles from you.`,
    };
  }
  if (
    context.location.stateCode &&
    cand.stateCodes.includes(context.location.stateCode)
  ) {
    return {
      reasonCode: "location_match",
      reason: `Serves ${context.location.stateCode}.`,
    };
  }
  if (context.workflowState) {
    return {
      reasonCode: "case_stage_relevant",
      reason: "Commonly used by applicants at this stage of their case.",
    };
  }
  return {
    reasonCode: "popular_in_area",
    reason: "Frequently helpful to others in similar situations.",
  };
}

// ---------------------------------------------------------------------------
// Top-level orchestration
// ---------------------------------------------------------------------------

/**
 * Generates a fresh RecommendationSet for the given actor. The actor must
 * have already been authorized via can("recommendation:generate", ...).
 */
export async function generateRecommendations(params: {
  actor: PolicyActor;
  contextInput?: Partial<RecommendationContext>;
  supabase?: SupabaseClient;
}): Promise<RecommendationSet> {
  const supabase = params.supabase ?? getSupabaseAdmin();

  if (!params.actor.userId) {
    throw new AppError("VALIDATION_ERROR", "Actor userId required.", undefined, 400);
  }

  const baseContext = await buildRecommendationContext(params.actor, supabase);
  const context: RecommendationContext = {
    ...baseContext,
    ...params.contextInput,
    // Merge arrays cleanly so tests can inject overrides
    intakeSignals: {
      ...baseContext.intakeSignals,
      ...(params.contextInput?.intakeSignals ?? {}),
    },
    location: {
      ...baseContext.location,
      ...(params.contextInput?.location ?? {}),
    },
    excludedProviderIds:
      params.contextInput?.excludedProviderIds ?? baseContext.excludedProviderIds,
  };

  const candidates = await fetchCandidateResources(context, supabase);
  const ranked = rankRecommendations(candidates, context);
  const items = ranked
    .slice(0, 20)
    .map((cand, idx) => candidateToItem(cand, context, idx));

  const uniqueCategories = Array.from(
    new Set(items.map((i) => i.category)),
  ) as RecommendationCategory[];

  return {
    setId: randomUUID(),
    userId: params.actor.userId,
    items,
    generatedAt: new Date().toISOString(),
    contextSummary: {
      stateCode: context.location.stateCode,
      categories: uniqueCategories,
      workflowState: context.workflowState,
      excludedCount: context.excludedProviderIds.length,
    },
  };
}

/**
 * Read-optimized entrypoint. In v1 this is an alias for generateRecommendations
 * since caching is deferred. When the recommendation_cache table ships, this
 * will prefer a recent cache hit before falling through to generation.
 */
export async function getRecommendations(params: {
  actor: PolicyActor;
  supabase?: SupabaseClient;
}): Promise<RecommendationSet> {
  return generateRecommendations(params);
}
