/**
 * Domain 6.1 — Analytics aggregation worker.
 *
 * Pipeline: trust_signal_events → trust_signal_aggregates_windowed
 *                               → trust_signal_summary
 *                               → trust_analytics_snapshots
 *
 * Hard rules enforced here:
 *   - Signals flagged in signal_event_exclusions are never counted.
 *   - Ecosystem snapshots never expose any metric attributable to fewer than
 *     MIN_ORG_COUNT organizations.
 *   - Phase 6 scoring never calls into this file — this file WRITES the
 *     summary table that scoring displays read from.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildReviewWindowColumns } from "@/lib/server/trust/reviewWindowService";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const WINDOW_TYPES = ["30_day", "90_day", "all_time"] as const;
export type WindowType = (typeof WINDOW_TYPES)[number];

const WINDOW_MS: Record<WindowType, number | null> = {
  "30_day": 30 * 24 * 60 * 60 * 1000,
  "90_day": 90 * 24 * 60 * 60 * 1000,
  all_time: null,
};

/** Category-key → column-name projection for trust_signal_summary. */
const CATEGORY_COLUMN: Record<string, string> = {
  response_accessibility: "response_accessibility_score",
  advocate_competency: "advocate_competency_score",
  case_outcomes: "case_outcomes_score",
  victim_experience: "victim_experience_score",
  org_reliability: "org_reliability_score",
  system_integration: "system_integration_score",
};

/** Minimum org count for an ecosystem metric to be exposed. */
export const MIN_ORG_COUNT = 5 as const;

// Confidence floor: 30 days active AND ≥5 cases AND ≥3/6 categories w/ data.
const CONFIDENCE_FLOOR_DAYS = 30;
const CONFIDENCE_FLOOR_CASES = 5;
const CONFIDENCE_FLOOR_CATEGORIES = 3;

// ---------------------------------------------------------------------------
// computeAggregatesForOrg
// ---------------------------------------------------------------------------

interface RawEvent {
  id: string;
  signal_type: string;
  value: number;
  created_at: string;
}

export async function computeAggregatesForOrg(
  organizationId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{ signalsProcessed: number; aggregatesUpdated: number }> {
  // Pull all raw events for the org (all_time is the widest window).
  const { data: events, error } = await supabase
    .from("trust_signal_events")
    .select("id, signal_type, value, created_at")
    .eq("org_id", organizationId);
  if (error || !events) return { signalsProcessed: 0, aggregatesUpdated: 0 };

  const rows = events as RawEvent[];
  if (rows.length === 0) return { signalsProcessed: 0, aggregatesUpdated: 0 };

  // Anti-join against signal_event_exclusions.
  const eventIds = rows.map((r) => r.id);
  const { data: exclusions } = await supabase
    .from("signal_event_exclusions")
    .select("signal_event_id")
    .in("signal_event_id", eventIds);
  const excluded = new Set(
    (exclusions ?? []).map((e: { signal_event_id: string }) => e.signal_event_id),
  );
  const usable = rows.filter((r) => !excluded.has(r.id));
  if (usable.length === 0) return { signalsProcessed: rows.length, aggregatesUpdated: 0 };

  const now = Date.now();
  type Bucket = { count: number; sum: number; min: number; max: number };
  const buckets = new Map<string, Bucket>();

  for (const ev of usable) {
    const eventMs = new Date(ev.created_at).getTime();
    const value = Number(ev.value) || 0;
    for (const w of WINDOW_TYPES) {
      const span = WINDOW_MS[w];
      if (span !== null && now - eventMs > span) continue;
      const key = `${ev.signal_type}|${w}`;
      const b = buckets.get(key);
      if (!b) {
        buckets.set(key, { count: 1, sum: value, min: value, max: value });
      } else {
        b.count += 1;
        b.sum += value;
        b.min = Math.min(b.min, value);
        b.max = Math.max(b.max, value);
      }
    }
  }

  const upserts: Record<string, unknown>[] = [];
  for (const [key, b] of buckets) {
    const [signalType, windowType] = key.split("|");
    upserts.push({
      organization_id: organizationId,
      signal_type: signalType,
      window_type: windowType,
      event_count: b.count,
      sum_value: b.sum,
      avg_value: b.count > 0 ? b.sum / b.count : null,
      min_value: b.min,
      max_value: b.max,
      last_computed_at: new Date().toISOString(),
    });
  }

  if (upserts.length > 0) {
    await supabase.from("trust_signal_aggregates_windowed").upsert(upserts, {
      onConflict: "organization_id,signal_type,window_type",
    });
  }

  return { signalsProcessed: usable.length, aggregatesUpdated: upserts.length };
}

// ---------------------------------------------------------------------------
// computeAllAggregates
// ---------------------------------------------------------------------------

export async function computeAllAggregates(
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{ orgsProcessed: number; aggregatesUpdated: number }> {
  // Distinct org_ids with at least one event.
  const { data, error } = await supabase
    .from("trust_signal_events")
    .select("org_id")
    .limit(100000);
  if (error || !data) return { orgsProcessed: 0, aggregatesUpdated: 0 };

  const orgIds = Array.from(
    new Set((data as Array<{ org_id: string }>).map((r) => r.org_id)),
  );

  let totalUpdated = 0;
  for (const orgId of orgIds) {
    const res = await computeAggregatesForOrg(orgId, supabase);
    totalUpdated += res.aggregatesUpdated;
    // Roll forward into the summary snapshot for each org that had data.
    if (res.aggregatesUpdated > 0) {
      await snapshotOrgScore(orgId, supabase).catch(() => {
        /* non-fatal — next run retries */
      });
    }
  }

  return { orgsProcessed: orgIds.length, aggregatesUpdated: totalUpdated };
}

// ---------------------------------------------------------------------------
// snapshotOrgScore
// ---------------------------------------------------------------------------

type CategoryKey =
  | "response_accessibility"
  | "advocate_competency"
  | "case_outcomes"
  | "victim_experience"
  | "org_reliability"
  | "system_integration";

type CategorySums = Partial<Record<CategoryKey, number>>;

/**
 * Builds a trust_signal_summary row from the windowed aggregates.
 *
 * The six category scores are normalized to 0..1 then published as 0..100
 * in the summary table. Uses the 30-day window as the primary signal of
 * current performance; aggregates with no data in the window produce null.
 */
export async function snapshotOrgScore(
  organizationId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<void> {
  // Read the 30_day window (primary) + all_time (for confidence floor inputs).
  const { data: aggs } = await supabase
    .from("trust_signal_aggregates_windowed")
    .select("signal_type, window_type, event_count, avg_value, sum_value")
    .eq("organization_id", organizationId);

  const rows = (aggs ?? []) as Array<{
    signal_type: string;
    window_type: WindowType;
    event_count: number;
    avg_value: number | null;
    sum_value: number;
  }>;

  // Group by category — signal→category mapping lives in the active
  // methodology, but we default to a well-known mapping so analytics can run
  // before a methodology is published. Unknown signals are ignored.
  const signalToCategory = canonicalSignalToCategory();

  const categoryAverages: CategorySums = {};
  const categoryCounts: Record<string, number> = {};
  const thirtyDayRows = rows.filter((r) => r.window_type === "30_day");
  for (const row of thirtyDayRows) {
    const cat = signalToCategory[row.signal_type] as CategoryKey | undefined;
    if (!cat) continue;
    const avg = row.avg_value ?? 0;
    const bounded = Math.max(0, Math.min(1, normalizeSignalAverage(avg)));
    categoryAverages[cat] = (categoryAverages[cat] ?? 0) + bounded;
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }

  const summaryColumns: Record<string, number | null> = {
    response_accessibility_score: null,
    advocate_competency_score: null,
    case_outcomes_score: null,
    victim_experience_score: null,
    org_reliability_score: null,
    system_integration_score: null,
  };
  for (const [cat, column] of Object.entries(CATEGORY_COLUMN)) {
    const n = categoryCounts[cat] ?? 0;
    const sum = categoryAverages[cat as CategoryKey];
    if (n > 0 && typeof sum === "number") {
      summaryColumns[column] = Math.round((sum / n) * 100);
    }
  }

  // Confidence floor.
  const orgActive = await isOrgActiveLongEnough(organizationId, supabase);
  const caseCount = rows
    .filter(
      (r) =>
        r.window_type === "all_time" &&
        (r.signal_type === "support_request.accepted" ||
          r.signal_type === "case_response_time"),
    )
    .reduce((acc, r) => acc + r.event_count, 0);
  const categoriesWithData = Object.values(summaryColumns).filter(
    (v) => typeof v === "number",
  ).length;

  const confidenceFloorMet =
    orgActive &&
    caseCount >= CONFIDENCE_FLOOR_CASES &&
    categoriesWithData >= CONFIDENCE_FLOOR_CATEGORIES;

  // Overall = equal-weighted mean across categories that have data. Null when
  // no category has data. For tier bucketing we need both data and floor.
  const overall =
    categoriesWithData > 0
      ? Math.round(
          Object.values(summaryColumns)
            .filter((v): v is number => typeof v === "number")
            .reduce((a, b) => a + b, 0) / categoriesWithData,
        )
      : null;

  let tier: "comprehensive" | "established" | "developing" | "data_pending";
  if (!confidenceFloorMet || overall === null) {
    tier = "data_pending";
  } else if (overall >= 85) {
    tier = "comprehensive";
  } else if (overall >= 65) {
    tier = "established";
  } else {
    tier = "developing";
  }

  // A newly computed score ALWAYS enters the 30-day private review window.
  // The org sees it privately; the cron flips public_display_active later.
  const reviewWindow = buildReviewWindowColumns();

  const summaryRow = {
    organization_id: organizationId,
    response_accessibility_score: summaryColumns.response_accessibility_score,
    advocate_competency_score: summaryColumns.advocate_competency_score,
    case_outcomes_score: summaryColumns.case_outcomes_score,
    victim_experience_score: summaryColumns.victim_experience_score,
    org_reliability_score: summaryColumns.org_reliability_score,
    system_integration_score: summaryColumns.system_integration_score,
    overall_score: overall,
    quality_tier: tier,
    confidence_floor_met: confidenceFloorMet,
    computed_at: new Date().toISOString(),
    methodology_version: "v1",
    ...reviewWindow,
  };

  await supabase
    .from("trust_signal_summary")
    .upsert(summaryRow, { onConflict: "organization_id" });

  // Append a historical snapshot.
  await supabase.from("trust_analytics_snapshots").insert({
    snapshot_type: "org_score",
    organization_id: organizationId,
    data: summaryRow,
  });
}

// ---------------------------------------------------------------------------
// createEcosystemSnapshot
// ---------------------------------------------------------------------------

/**
 * Ecosystem aggregation. Hard rule: any metric computed from fewer than
 * MIN_ORG_COUNT organizations is omitted entirely — never blurred, never
 * rounded, just absent. This is the k-anonymity guarantee for agency views.
 */
export async function createEcosystemSnapshot(
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<{ orgsIncluded: number }> {
  const { data, error } = await supabase
    .from("trust_signal_summary")
    .select(
      "organization_id, overall_score, quality_tier, response_accessibility_score, advocate_competency_score, case_outcomes_score, victim_experience_score, org_reliability_score, system_integration_score, confidence_floor_met",
    )
    // Only include orgs whose private review window has closed. Private
    // scores must NEVER contribute to the agency-visible ecosystem snapshot.
    .eq("public_display_active", true);
  if (error || !data) return { orgsIncluded: 0 };

  const rows = data as Array<{
    organization_id: string;
    overall_score: number | null;
    quality_tier: string;
    response_accessibility_score: number | null;
    advocate_competency_score: number | null;
    case_outcomes_score: number | null;
    victim_experience_score: number | null;
    org_reliability_score: number | null;
    system_integration_score: number | null;
    confidence_floor_met: boolean;
  }>;

  const orgsIncluded = rows.length;

  // Tier distribution — only published when >= MIN_ORG_COUNT orgs.
  const tierDistribution: Record<string, number> = {};
  for (const r of rows) {
    tierDistribution[r.quality_tier] = (tierDistribution[r.quality_tier] ?? 0) + 1;
  }
  const publishedTierDistribution =
    orgsIncluded >= MIN_ORG_COUNT ? tierDistribution : null;

  // Category averages across orgs with data in each column. Each category
  // independently enforces the MIN_ORG_COUNT gate.
  const categoryAverages: Record<string, number | null> = {};
  for (const col of Object.values(CATEGORY_COLUMN)) {
    const vals = rows
      .map((r) => r[col as keyof typeof r])
      .filter((v): v is number => typeof v === "number");
    categoryAverages[col] = vals.length >= MIN_ORG_COUNT
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : null;
  }

  const overallVals = rows
    .map((r) => r.overall_score)
    .filter((v): v is number => typeof v === "number");
  const ecosystemOverall =
    overallVals.length >= MIN_ORG_COUNT
      ? Math.round(overallVals.reduce((a, b) => a + b, 0) / overallVals.length)
      : null;

  await supabase.from("trust_analytics_snapshots").insert({
    snapshot_type: "ecosystem",
    organization_id: null,
    data: {
      orgs_included: orgsIncluded,
      min_org_count_gate: MIN_ORG_COUNT,
      tier_distribution: publishedTierDistribution,
      category_averages: categoryAverages,
      ecosystem_overall: ecosystemOverall,
    },
  });

  return { orgsIncluded };
}

// ---------------------------------------------------------------------------
// Read helpers (for agency routes + Phase 6 display)
// ---------------------------------------------------------------------------

export async function getTrustSignalSummary(
  organizationId: string,
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("trust_signal_summary")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Record<string, unknown>;
}

export async function getLatestEcosystemSnapshot(
  supabase: SupabaseClient = getSupabaseAdmin(),
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("trust_analytics_snapshots")
    .select("*")
    .eq("snapshot_type", "ecosystem")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function canonicalSignalToCategory(): Record<string, string> {
  return {
    // response_accessibility
    case_response_time: "response_accessibility",
    message_response_latency: "response_accessibility",
    message_response_rate: "response_accessibility",
    // advocate_competency
    thread_participation_rate: "advocate_competency",
    // case_outcomes
    case_time_to_resolution: "case_outcomes",
    cvc_application_success: "case_outcomes",
    cvc_application_error: "case_outcomes",
    case_reassignment_frequency: "case_outcomes",
    // victim_experience — survey-sourced (handled separately in scoring) but
    //   also mapped here so summary computation is self-contained for display.
    "survey.victim_experience": "victim_experience",
    // org_reliability
    "support_request.accepted": "org_reliability",
    "support_request.declined": "org_reliability",
    "support_request.closed": "org_reliability",
    document_completion_rate: "org_reliability",
    // system_integration
    "support_request.submitted": "system_integration",
    intake_completion_time: "system_integration",
    case_progress_latency: "system_integration",
  };
}

function normalizeSignalAverage(avg: number): number {
  // Safe identity mapping for signals already in [0,1]; clamps anything else.
  // Latency/count signals are treated as "higher is worse" only by the
  // methodology — here we keep a uniform clamp so the summary never produces
  // out-of-range scores.
  if (!Number.isFinite(avg)) return 0;
  if (avg > 1) return Math.min(1, Math.log10(avg + 1) / 6);
  return Math.max(0, avg);
}

async function isOrgActiveLongEnough(
  organizationId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data } = await supabase
    .from("organizations")
    .select("created_at")
    .eq("id", organizationId)
    .maybeSingle();
  const createdAt = (data as { created_at?: string } | null)?.created_at;
  if (!createdAt) return false;
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return ageDays >= CONFIDENCE_FLOOR_DAYS;
}
