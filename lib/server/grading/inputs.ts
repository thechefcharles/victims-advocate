/**
 * Phase C / Domain 0.5: Aggregate platform signals into org-level scoring inputs (honest proxies).
 *
 * Trust Law compliant: reads from signal aggregates when available,
 * falls back to getOrganizationSignals() during migration period.
 *
 * Grading does not query cases, routing_runs, completeness_runs,
 * case_messages, or organizations directly — ever.
 */

import { getOrganizationSignals } from "@/lib/server/orgSignals/aggregate";
import type { OrganizationSignals } from "@/lib/server/orgSignals/types";
import type { OrgScoringInputs } from "./types";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSignalAggregates } from "@/lib/server/trustSignal";
import type { SignalAggregate } from "@/lib/server/trustSignal";

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

function profileCompleteness(profile: OrganizationSignals["profile"]): number {
  let n = 0;
  const max = 7;
  if (profile.serviceTypesCount > 0) n++;
  if (profile.languagesCount > 0) n++;
  if (profile.hasCoverage) n++;
  if (profile.intakeMethodsCount > 0) n++;
  if (profile.capacityStatus !== "unknown") n++;
  if (profile.acceptingClients) n++;
  if (profile.avgResponseTimeHours != null) n++;
  if (profile.accessibilityFeaturesCount > 0) n++;
  return Math.min(1, n / max);
}

/** Estimate 90d case volume from aggregate case age (no per-case reads). */
function estimatedCaseCountLast90d(total: number, avgAgeDays: number | null): number {
  if (total === 0) return 0;
  if (avgAgeDays == null || avgAgeDays <= 0) return total;
  const frac = 1 - Math.exp(-90 / avgAgeDays);
  return Math.min(total, Math.max(0, Math.round(total * frac)));
}

/** Lower-bound proxy for total message count from thread-level signals only. */
function caseMessagesTotalProxy(signals: OrganizationSignals): number {
  const { orgCasesWithMessages, recentMessageThreads } = signals.messaging;
  return Math.max(orgCasesWithMessages * 3, recentMessageThreads * 2, orgCasesWithMessages > 0 ? 1 : 0);
}

function messaging30dCounts(signals: OrganizationSignals): { advocate: number; victim: number } {
  const t = signals.messaging.recentMessageThreads;
  if (t <= 0) return { advocate: 0, victim: 0 };
  const victim =
    signals.messaging.replySignalConfidence === "high"
      ? Math.max(2, Math.round(t * 0.55))
      : Math.max(1, Math.round(t * 0.35));
  const advocate = Math.max(t, victim);
  return { advocate, victim };
}

/**
 * Returns the average emitted value for a signal type across all events.
 * Returns 0 when no aggregate exists for the type.
 */
function aggAvg(aggregates: SignalAggregate[], signalType: string): number {
  const agg = aggregates.find((a) => a.signal_type === signalType);
  if (!agg || agg.total_count === 0) return 0;
  return agg.total_value / agg.total_count;
}

export async function buildOrgScoringInputs(params: {
  organizationId: string;
}): Promise<OrgScoringInputs> {
  const { organizationId } = params;

  // Trust Law compliant: reads from signal aggregates when available,
  // falls back to getOrganizationSignals() during migration period.
  const supabase = getSupabaseAdmin();
  const aggregates = await getSignalAggregates(organizationId, supabase);

  // getOrganizationSignals() is always called — provides org profile fields
  // that are not encoded in numeric signal aggregates (name, accepting_clients, etc.)
  const signals = await getOrganizationSignals(organizationId);

  // Primary path: override workflow-derived fields with pre-aggregated values.
  // Org profile fields (name, capacity, languages, etc.) always come from signals.profile.
  if (aggregates.length > 0) {
    const { profile } = signals;

    const caseTotal = Math.max(0, Math.round(aggAvg(aggregates, "case_volume")));
    const avgAgeDays = aggAvg(aggregates, "case_age_distribution") || null;
    const routingRate = aggAvg(aggregates, "routing_coverage");
    const completenessRate = aggAvg(aggregates, "completeness_coverage");
    const msgVolume = Math.round(aggAvg(aggregates, "messaging_volume"));
    const msgRecent30d = Math.round(aggAvg(aggregates, "messaging_recency_30d"));
    const ocrRate = aggAvg(aggregates, "ocr_coverage");
    const apptRate = aggAvg(aggregates, "appointment_coverage");
    const profileCompl = aggAvg(aggregates, "profile_completeness");

    const casesWithRouting = Math.round(routingRate * caseTotal);
    const casesWithCompleteness = Math.round(completenessRate * caseTotal);
    const ocrRunsProxy = Math.max(0, Math.round(ocrRate * caseTotal));

    // messaging_recency_30d signal value = recentMessageThreads count
    const advocateMessages = msgRecent30d > 0 ? Math.max(msgRecent30d, 1) : 0;
    const victimMessages =
      msgRecent30d > 0 ? Math.max(1, Math.round(msgRecent30d * 0.35)) : 0;

    let appointmentsCompleted = 0;
    let appointmentsTotalTracked = 0;
    if (apptRate > 0 && caseTotal > 0) {
      appointmentsTotalTracked = Math.max(1, Math.round(apptRate * caseTotal));
      appointmentsCompleted = Math.round(appointmentsTotalTracked * 0.65);
    }

    return {
      organization_id: organizationId,
      org_name: profile.name,
      profile_completeness_0_1: profileCompl > 0 ? profileCompl : profileCompleteness(profile),
      accepting_clients: profile.acceptingClients,
      capacity_status: profile.capacityStatus,
      avg_response_time_hours: profile.avgResponseTimeHours,
      languages_count: profile.languagesCount,
      accessibility_count: profile.accessibilityFeaturesCount,
      intake_methods_count: profile.intakeMethodsCount,
      service_types_count: profile.serviceTypesCount,
      profile_last_updated_at: profile.lastProfileUpdate,
      profile_last_updated_days_ago: daysSince(profile.lastProfileUpdate),
      case_count_total: caseTotal,
      case_count_90d: estimatedCaseCountLast90d(caseTotal, avgAgeDays),
      cases_with_routing: casesWithRouting,
      cases_with_completeness: casesWithCompleteness,
      routing_ratio_0_1: routingRate,
      completeness_ratio_0_1: completenessRate,
      case_messages_total: msgVolume,
      advocate_messages_30d: advocateMessages,
      victim_messages_30d: victimMessages,
      ocr_runs_total: ocrRunsProxy,
      appointments_completed: appointmentsCompleted,
      appointments_total_tracked: appointmentsTotalTracked,
    };
  }

  // Fallback path: aggregates not yet populated — use live signals (existing behavior).

  const { profile } = signals;
  const totalCases = signals.cases.total;
  const routingRate = signals.workflow.routingUsageRate ?? 0;
  const completenessRate = signals.workflow.completenessUsageRate ?? 0;
  const ocrRate = signals.workflow.ocrUsageRate ?? 0;
  const apRate = signals.workflow.appointmentsUsageRate;

  const casesWithRouting = Math.round(routingRate * totalCases);
  const casesWithCompleteness = Math.round(completenessRate * totalCases);
  const ocrRunsProxy = Math.max(0, Math.round(ocrRate * totalCases));

  const { advocate, victim } = messaging30dCounts(signals);

  let appointmentsCompleted = 0;
  let appointmentsTotalTracked = 0;
  if (apRate != null && apRate > 0 && totalCases > 0) {
    appointmentsTotalTracked = Math.max(1, Math.round(apRate * totalCases));
    appointmentsCompleted = Math.round(appointmentsTotalTracked * 0.65);
  }

  return {
    organization_id: organizationId,
    org_name: profile.name,
    profile_completeness_0_1: profileCompleteness(profile),
    accepting_clients: profile.acceptingClients,
    capacity_status: profile.capacityStatus,
    avg_response_time_hours: profile.avgResponseTimeHours,
    languages_count: profile.languagesCount,
    accessibility_count: profile.accessibilityFeaturesCount,
    intake_methods_count: profile.intakeMethodsCount,
    service_types_count: profile.serviceTypesCount,
    profile_last_updated_at: profile.lastProfileUpdate,
    profile_last_updated_days_ago: daysSince(profile.lastProfileUpdate),
    case_count_total: totalCases,
    case_count_90d: estimatedCaseCountLast90d(totalCases, signals.cases.avgAgeDays),
    cases_with_routing: casesWithRouting,
    cases_with_completeness: casesWithCompleteness,
    routing_ratio_0_1: routingRate,
    completeness_ratio_0_1: completenessRate,
    case_messages_total: caseMessagesTotalProxy(signals),
    advocate_messages_30d: advocate,
    victim_messages_30d: victim,
    ocr_runs_total: ocrRunsProxy,
    appointments_completed: appointmentsCompleted,
    appointments_total_tracked: appointmentsTotalTracked,
  };
}
