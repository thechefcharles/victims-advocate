/**
 * Domain 6.1 — Reliability service.
 *
 * Read-only consumer of provider_reliability_summaries. The single source of
 * applicant-safe trust data — UI surfaces and the recommendations domain
 * (5.2) should call here, never the score snapshot directly.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { ProviderReliabilitySummary, ReliabilityTier } from "./trustTypes";
import { getCurrentReliabilitySummary } from "./trustRepository";

/**
 * Returns the current reliability summary for an organization, or null if
 * no snapshot has been computed yet. Public/applicant-safe shape.
 */
export async function getProviderReliabilitySummary(
  organizationId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<ProviderReliabilitySummary | null> {
  return getCurrentReliabilitySummary(organizationId, supabase);
}

/**
 * Convenience: returns just the tier label, or "unverified" when no
 * summary exists yet. Used by UI surfaces that need a quick answer.
 */
export async function resolveApplicantSafeTrustSurface(
  organizationId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{ tier: ReliabilityTier; freshness: string | null }> {
  const summary = await getCurrentReliabilitySummary(organizationId, supabase);
  if (!summary) return { tier: "unverified", freshness: null };
  return { tier: summary.reliabilityTier, freshness: summary.freshness };
}
