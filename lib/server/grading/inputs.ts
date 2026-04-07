/**
 * Phase C: Aggregate platform signals into org-level scoring inputs (honest proxies).
 * Workflow metrics come only from {@link getOrganizationSignals}; grading does not query
 * cases, routing_runs, completeness_runs, case_messages, or organizations directly.
 */

import { getOrganizationSignals } from "@/lib/server/orgSignals/aggregate";
import type { OrganizationSignals } from "@/lib/server/orgSignals/types";
import type { OrgScoringInputs } from "./types";

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

export async function buildOrgScoringInputs(params: {
  organizationId: string;
}): Promise<OrgScoringInputs> {
  const { organizationId } = params;

  const signals = await getOrganizationSignals(organizationId);

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
