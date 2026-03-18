/**
 * Phase C: Aggregate platform signals into org-level scoring inputs (honest proxies).
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import type { OrgScoringInputs } from "./types";

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

function profileCompleteness(org: Record<string, unknown>): number {
  let n = 0;
  const max = 7;
  if (Array.isArray(org.service_types) && org.service_types.length > 0) n++;
  if (Array.isArray(org.languages) && org.languages.length > 0) n++;
  if (
    org.coverage_area &&
    typeof org.coverage_area === "object" &&
    Object.keys(org.coverage_area as object).length > 0
  )
    n++;
  if (Array.isArray(org.intake_methods) && org.intake_methods.length > 0) n++;
  if (org.capacity_status && String(org.capacity_status) !== "unknown") n++;
  if (org.accepting_clients === true) n++;
  if (org.avg_response_time_hours != null && org.avg_response_time_hours !== "") n++;
  if (Array.isArray(org.accessibility_features) && org.accessibility_features.length > 0) n++;
  return Math.min(1, n / max);
}

export async function buildOrgScoringInputs(params: {
  organizationId: string;
}): Promise<OrgScoringInputs> {
  const { organizationId } = params;
  const supabase = getSupabaseAdmin();

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select(
      "id,name,service_types,languages,coverage_area,intake_methods,accessibility_features,accepting_clients,capacity_status,avg_response_time_hours,profile_last_updated_at"
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (orgErr || !org) {
    throw new AppError("NOT_FOUND", "Organization not found", undefined, 404);
  }

  const o = org as Record<string, unknown>;
  const since90 = new Date(Date.now() - 90 * 86400000).toISOString();

  const [
    casesTotal,
    cases90,
    routingRows,
    completenessRows,
    msgTotal,
    msgs30,
    ocrCount,
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", since90),
    supabase.from("routing_runs").select("case_id").eq("organization_id", organizationId),
    supabase.from("completeness_runs").select("case_id").eq("organization_id", organizationId),
    supabase
      .from("case_messages")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("case_messages")
      .select("sender_role,created_at")
      .eq("organization_id", organizationId)
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    supabase
      .from("ocr_runs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);

  let apptData: { status: string }[] = [];
  const apptRes = await supabase
    .from("appointments")
    .select("status")
    .eq("organization_id", organizationId);
  if (!apptRes.error && Array.isArray(apptRes.data)) {
    apptData = apptRes.data as { status: string }[];
  }

  const caseCountTotal = casesTotal.count ?? 0;
  const caseCount90d = cases90.count ?? 0;

  const routingCases = new Set(
    (routingRows.data ?? []).map((r: { case_id: string }) => r.case_id)
  );
  const completenessCases = new Set(
    (completenessRows.data ?? []).map((r: { case_id: string }) => r.case_id)
  );

  const routingRatio =
    caseCountTotal > 0 ? Math.min(1, routingCases.size / caseCountTotal) : 0;
  const completenessRatio =
    caseCountTotal > 0 ? Math.min(1, completenessCases.size / caseCountTotal) : 0;

  const msgRows = (msgs30.data ?? []) as { sender_role: string | null }[];
  let advocateMessages30d = 0;
  let victimMessages30d = 0;
  for (const m of msgRows) {
    const role = (m.sender_role ?? "").toLowerCase();
    if (role === "advocate") advocateMessages30d++;
    else if (role === "victim") victimMessages30d++;
    else advocateMessages30d++;
  }

  let appointmentsCompleted = 0;
  let appointmentsTotal = 0;
  for (const row of apptData) {
    appointmentsTotal++;
    if (String(row.status).toLowerCase() === "completed") appointmentsCompleted++;
  }

  const pl = o.profile_last_updated_at != null ? String(o.profile_last_updated_at) : null;

  return {
    organization_id: organizationId,
    org_name: String(o.name ?? ""),
    profile_completeness_0_1: profileCompleteness(o),
    accepting_clients: Boolean(o.accepting_clients),
    capacity_status: String(o.capacity_status ?? "unknown"),
    avg_response_time_hours:
      o.avg_response_time_hours != null && o.avg_response_time_hours !== ""
        ? Number(o.avg_response_time_hours)
        : null,
    languages_count: Array.isArray(o.languages) ? o.languages.length : 0,
    accessibility_count: Array.isArray(o.accessibility_features)
      ? o.accessibility_features.length
      : 0,
    intake_methods_count: Array.isArray(o.intake_methods) ? o.intake_methods.length : 0,
    service_types_count: Array.isArray(o.service_types) ? o.service_types.length : 0,
    profile_last_updated_at: pl,
    profile_last_updated_days_ago: daysSince(pl),
    case_count_total: caseCountTotal,
    case_count_90d: caseCount90d,
    cases_with_routing: routingCases.size,
    cases_with_completeness: completenessCases.size,
    routing_ratio_0_1: routingRatio,
    completeness_ratio_0_1: completenessRatio,
    case_messages_total: msgTotal.count ?? 0,
    advocate_messages_30d: advocateMessages30d,
    victim_messages_30d: victimMessages30d,
    ocr_runs_total: ocrCount.count ?? 0,
    appointments_completed: appointmentsCompleted,
    appointments_total_tracked: appointmentsTotal,
  };
}
