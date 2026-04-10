/**
 * Domain 6.2 — Agency analytics service.
 *
 * **CRITICAL RULE**: ALL analytics MUST read from `analytics_snapshots` table.
 * NEVER live-join `cases`, `programs`, or `cvc_applications` for dashboard metrics.
 *
 * If analytics_snapshots is empty (no aggregation pipeline provisioned yet),
 * the service returns empty results gracefully. It does NOT fall back to
 * live-joining operational tables — that would violate the architecture.
 *
 * For provider comparison/reliability, reads from Domain 6.1 pre-computed
 * tables: `provider_reliability_summaries`, `trust_signal_aggregates`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AnalyticsSnapshot, AnalyticsSnapshotType } from "./agencyTypes";
import { getAnalyticsSnapshots } from "./agencyRepository";

export interface AgencyAnalyticsResult {
  snapshotType: AnalyticsSnapshotType;
  snapshots: AnalyticsSnapshot[];
  empty: boolean;
}

/**
 * Primary analytics entrypoint. Reads from analytics_snapshots — NEVER from
 * operational tables.
 */
export async function getAgencyAnalytics(params: {
  agencyId: string;
  snapshotType: AnalyticsSnapshotType;
  supabase?: SupabaseClient;
}): Promise<AgencyAnalyticsResult> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  const snapshots = await getAnalyticsSnapshots(
    params.agencyId,
    params.snapshotType,
    supabase,
  );
  return {
    snapshotType: params.snapshotType,
    snapshots,
    empty: snapshots.length === 0,
  };
}

/**
 * Provider comparison view — reads from Domain 6.1 reliability summaries.
 * Returns an aggregate view of reliability tier distribution for in-scope orgs.
 * NEVER reads from cases/programs directly.
 */
export async function getProviderComparisonView(params: {
  agencyId: string;
  inScopeOrgIds: string[];
  supabase?: SupabaseClient;
}): Promise<{
  orgCount: number;
  tierDistribution: Record<string, number>;
}> {
  const supabase = params.supabase ?? getSupabaseAdmin();
  if (params.inScopeOrgIds.length === 0) {
    return { orgCount: 0, tierDistribution: {} };
  }

  const { data, error } = await supabase
    .from("provider_reliability_summaries")
    .select("organization_id, reliability_tier")
    .in("organization_id", params.inScopeOrgIds)
    .eq("is_current", true);

  if (error) {
    return { orgCount: 0, tierDistribution: {} };
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const tierDistribution: Record<string, number> = {};
  for (const row of rows) {
    const tier = String(row.reliability_tier ?? "unverified");
    tierDistribution[tier] = (tierDistribution[tier] ?? 0) + 1;
  }
  return { orgCount: rows.length, tierDistribution };
}

/**
 * Service gap analysis — identifies under-served areas from analytics snapshots.
 * Returns the most recent service_gap snapshot, or empty result.
 */
export async function getServiceGapView(params: {
  agencyId: string;
  supabase?: SupabaseClient;
}): Promise<AgencyAnalyticsResult> {
  return getAgencyAnalytics({
    agencyId: params.agencyId,
    snapshotType: "service_gap",
    supabase: params.supabase,
  });
}
