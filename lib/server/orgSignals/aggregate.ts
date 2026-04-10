import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AppError } from "@/lib/server/api";
import {
  average,
  clampRate,
  daysBetween,
  profileCompletenessBucket,
  replyConfidence,
  toIsoOrNull,
} from "./helpers";
import type { OrganizationSignals } from "./types";
import { emitSignal } from "@/lib/server/trustSignal";

/** System sentinel for background signal emissions (no human actor). */
const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";
/** Daily dedup key: stable for a given org + signal type within a calendar day. */
function dailyIdempotencyKey(orgId: string, signalType: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${orgId}:${signalType}:${date}`;
}

type CaseRow = { id: string; created_at: string; updated_at: string; status: string };
type MessageRow = { case_id: string; created_at: string; sender_role: string | null };
type RunCaseRow = { case_id: string };
type CompletenessRunRow = { case_id: string; result: Record<string, unknown> | null };
type AppointmentRow = { case_id: string };

function isCaseActive(status: string): boolean {
  const s = status.toLowerCase();
  return s !== "closed";
}

function isOrgSideRole(role: string | null): boolean {
  const r = (role ?? "").toLowerCase();
  return r === "advocate" || r === "org_owner" || r === "supervisor" || r === "victim_advocate";
}

function isApplicantSideRole(role: string | null): boolean {
  return (role ?? "").toLowerCase() === "victim";
}

export async function getOrganizationSignals(organizationId: string): Promise<OrganizationSignals> {
  const supabase = getSupabaseAdmin();
  const computedAt = new Date().toISOString();

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select(
      "id,name,profile_status,profile_stage,last_profile_update,profile_last_updated_at,service_types,languages,coverage_area,capacity_status,intake_methods,accessibility_features,accepting_clients,avg_response_time_hours"
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (orgErr || !org) {
    throw new AppError("NOT_FOUND", "Organization not found", undefined, 404);
  }

  const nowIso = computedAt;
  const staleCutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const messageRecentCutoff = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data: caseRows, error: caseErr } = await supabase
    .from("cases")
    .select("id,created_at,updated_at,status")
    .eq("organization_id", organizationId);
  if (caseErr) throw new AppError("INTERNAL", "Failed to load cases", caseErr, 500);

  const cases = (caseRows ?? []) as CaseRow[];
  const caseIds = new Set(cases.map((c) => c.id));
  const totalCases = cases.length;
  const activeCases = cases.filter((c) => isCaseActive(c.status));
  const staleCases = activeCases.filter((c) => c.updated_at && c.updated_at < staleCutoff);
  const caseAges = cases
    .map((c) => daysBetween(c.created_at, nowIso))
    .filter((v): v is number => v != null && v >= 0);

  const [
    messagesAllRes,
    messagesRecentRes,
    routingRes,
    completenessRes,
    ocrRes,
    apptRes,
  ] = await Promise.all([
    supabase
      .from("case_messages")
      .select("case_id,created_at,sender_role")
      .eq("organization_id", organizationId),
    supabase
      .from("case_messages")
      .select("case_id,created_at,sender_role")
      .eq("organization_id", organizationId)
      .gte("created_at", messageRecentCutoff),
    supabase.from("routing_runs").select("case_id").eq("organization_id", organizationId),
    supabase
      .from("completeness_runs")
      .select("case_id,result")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase.from("ocr_runs").select("case_id").eq("organization_id", organizationId),
    supabase.from("appointments").select("case_id").eq("organization_id", organizationId),
  ]);

  if (messagesAllRes.error) {
    throw new AppError("INTERNAL", "Failed to load message signals", messagesAllRes.error, 500);
  }
  if (messagesRecentRes.error) {
    throw new AppError("INTERNAL", "Failed to load recent message signals", messagesRecentRes.error, 500);
  }
  if (routingRes.error) {
    throw new AppError("INTERNAL", "Failed to load routing usage signals", routingRes.error, 500);
  }
  if (completenessRes.error) {
    throw new AppError(
      "INTERNAL",
      "Failed to load completeness usage signals",
      completenessRes.error,
      500
    );
  }
  if (ocrRes.error) {
    throw new AppError("INTERNAL", "Failed to load OCR usage signals", ocrRes.error, 500);
  }

  const messagesAll = (messagesAllRes.data ?? []) as MessageRow[];
  const messagesRecent = (messagesRecentRes.data ?? []) as MessageRow[];
  const routingRows = (routingRes.data ?? []) as RunCaseRow[];
  const completenessRows = (completenessRes.data ?? []) as CompletenessRunRow[];
  const ocrRows = (ocrRes.data ?? []) as RunCaseRow[];

  const casesWithMessages = new Set(messagesAll.map((m) => m.case_id).filter((id) => caseIds.has(id)));
  const recentMessageThreads = new Set(
    messagesRecent.map((m) => m.case_id).filter((id) => caseIds.has(id))
  );

  const msgByCase = new Map<string, MessageRow[]>();
  for (const m of messagesAll) {
    if (!caseIds.has(m.case_id)) continue;
    const arr = msgByCase.get(m.case_id) ?? [];
    arr.push(m);
    msgByCase.set(m.case_id, arr);
  }

  const firstReplyHours: number[] = [];
  for (const rows of msgByCase.values()) {
    const sorted = [...rows].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    const firstVictim = sorted.find((m) => isApplicantSideRole(m.sender_role));
    if (!firstVictim) continue;
    const victimTime = Date.parse(firstVictim.created_at);
    if (Number.isNaN(victimTime)) continue;
    const firstOrgReply = sorted.find((m) => {
      if (!isOrgSideRole(m.sender_role)) return false;
      const t = Date.parse(m.created_at);
      return !Number.isNaN(t) && t >= victimTime;
    });
    if (!firstOrgReply) continue;
    const replyTime = Date.parse(firstOrgReply.created_at);
    if (Number.isNaN(replyTime)) continue;
    firstReplyHours.push((replyTime - victimTime) / 3600000);
  }

  const routingCaseSet = new Set(routingRows.map((r) => r.case_id).filter((id) => caseIds.has(id)));
  const completenessCaseSet = new Set(
    completenessRows.map((r) => r.case_id).filter((id) => caseIds.has(id))
  );
  const ocrCaseSet = new Set(ocrRows.map((r) => r.case_id).filter((id) => caseIds.has(id)));

  let appointmentsUsageRate: number | null = null;
  let appointmentsNotAvailable = false;
  if (apptRes.error) {
    appointmentsNotAvailable = true;
  } else {
    const apptRows = (apptRes.data ?? []) as AppointmentRow[];
    const apptCaseSet = new Set(apptRows.map((a) => a.case_id).filter((id) => caseIds.has(id)));
    appointmentsUsageRate = clampRate(apptCaseSet.size, totalCases);
  }

  const latestCompletenessByCase = new Map<string, Record<string, unknown>>();
  for (const row of completenessRows) {
    if (!caseIds.has(row.case_id)) continue;
    if (latestCompletenessByCase.has(row.case_id)) continue;
    if (row.result && typeof row.result === "object") {
      latestCompletenessByCase.set(row.case_id, row.result);
    }
  }

  let casesWithBlocking = 0;
  let casesWithMissingDocs = 0;
  for (const result of latestCompletenessByCase.values()) {
    const summary = result.summary_counts as Record<string, unknown> | undefined;
    const blocking = summary?.blocking_count;
    if (typeof blocking === "number" && blocking > 0) {
      casesWithBlocking++;
    }
    const missingItems = Array.isArray(result.missing_items)
      ? (result.missing_items as Array<Record<string, unknown>>)
      : [];
    const hasMissingDoc = missingItems.some((i) => i.type === "missing_document");
    if (hasMissingDoc) {
      casesWithMissingDocs++;
    }
  }

  const lastProfileUpdate =
    toIsoOrNull(org.last_profile_update) ?? toIsoOrNull(org.profile_last_updated_at);
  const hasCoverage =
    !!org.coverage_area &&
    typeof org.coverage_area === "object" &&
    !Array.isArray(org.coverage_area) &&
    Object.keys(org.coverage_area as Record<string, unknown>).length > 0;

  const flags: string[] = [];
  if (totalCases < 5) flags.push("insufficient_case_volume");
  if (recentMessageThreads.size < 3) flags.push("limited_message_data");
  if (org.profile_stage !== "searchable" && org.profile_stage !== "enriched") {
    flags.push("profile_not_searchable");
  }
  if (
    (routingCaseSet.size === 0 && completenessCaseSet.size === 0 && ocrCaseSet.size === 0) ||
    totalCases < 3
  ) {
    flags.push("workflow_usage_sparse");
  }
  if (appointmentsNotAvailable) flags.push("appointments_not_available");

  const serviceTypesCount = Array.isArray(org.service_types) ? org.service_types.length : 0;
  const languagesCount = Array.isArray(org.languages) ? org.languages.length : 0;
  const intakeMethodsCount = Array.isArray(org.intake_methods) ? org.intake_methods.length : 0;
  const accessibilityFeaturesCount = Array.isArray(org.accessibility_features)
    ? org.accessibility_features.length
    : 0;
  const capacityStatus = String(org.capacity_status ?? "unknown");

  // Domain 0.5 — emit trust signals as fire-and-forget side effects.
  // All calls are void (no await, no error propagation).
  // Existing queries above remain intact as the primary data source.
  {
    const profileComplScore =
      [
        serviceTypesCount > 0,
        languagesCount > 0,
        hasCoverage,
        intakeMethodsCount > 0,
        capacityStatus !== "unknown",
        org.accepting_clients === true,
        org.avg_response_time_hours != null,
        accessibilityFeaturesCount > 0,
      ].filter(Boolean).length / 8;

    void emitSignal(
      { orgId: organizationId, signalType: "case_volume", value: totalCases,
        actorUserId: SYSTEM_ACTOR_ID, actorAccountType: "platform_admin",
        idempotencyKey: dailyIdempotencyKey(organizationId, "case_volume") },
      supabase,
    );
    void emitSignal(
      { orgId: organizationId, signalType: "case_age_distribution",
        value: average(caseAges) ?? 0,
        actorUserId: SYSTEM_ACTOR_ID, actorAccountType: "platform_admin",
        idempotencyKey: dailyIdempotencyKey(organizationId, "case_age_distribution") },
      supabase,
    );
    void emitSignal(
      { orgId: organizationId, signalType: "messaging_volume",
        value: casesWithMessages.size,
        actorUserId: SYSTEM_ACTOR_ID, actorAccountType: "platform_admin",
        idempotencyKey: dailyIdempotencyKey(organizationId, "messaging_volume") },
      supabase,
    );
    void emitSignal(
      { orgId: organizationId, signalType: "messaging_recency_30d",
        value: recentMessageThreads.size,
        actorUserId: SYSTEM_ACTOR_ID, actorAccountType: "platform_admin",
        idempotencyKey: dailyIdempotencyKey(organizationId, "messaging_recency_30d") },
      supabase,
    );
    void emitSignal(
      { orgId: organizationId, signalType: "routing_coverage",
        value: clampRate(routingCaseSet.size, totalCases) ?? 0,
        actorUserId: SYSTEM_ACTOR_ID, actorAccountType: "platform_admin",
        idempotencyKey: dailyIdempotencyKey(organizationId, "routing_coverage") },
      supabase,
    );
    void emitSignal(
      { orgId: organizationId, signalType: "completeness_coverage",
        value: clampRate(completenessCaseSet.size, totalCases) ?? 0,
        actorUserId: SYSTEM_ACTOR_ID, actorAccountType: "platform_admin",
        idempotencyKey: dailyIdempotencyKey(organizationId, "completeness_coverage") },
      supabase,
    );
    void emitSignal(
      { orgId: organizationId, signalType: "ocr_coverage",
        value: clampRate(ocrCaseSet.size, totalCases) ?? 0,
        actorUserId: SYSTEM_ACTOR_ID, actorAccountType: "platform_admin",
        idempotencyKey: dailyIdempotencyKey(organizationId, "ocr_coverage") },
      supabase,
    );
    void emitSignal(
      { orgId: organizationId, signalType: "appointment_coverage",
        value: appointmentsUsageRate ?? 0,
        actorUserId: SYSTEM_ACTOR_ID, actorAccountType: "platform_admin",
        idempotencyKey: dailyIdempotencyKey(organizationId, "appointment_coverage") },
      supabase,
    );
    void emitSignal(
      { orgId: organizationId, signalType: "profile_completeness",
        value: profileComplScore,
        actorUserId: SYSTEM_ACTOR_ID, actorAccountType: "platform_admin",
        idempotencyKey: dailyIdempotencyKey(organizationId, "profile_completeness") },
      supabase,
    );
  }

  return {
    organizationId,
    computedAt,
    profile: {
      profileStatus: org.profile_status != null ? String(org.profile_status) : null,
      profileStage: org.profile_stage != null ? String(org.profile_stage) : null,
      lastProfileUpdate,
      completeness: profileCompletenessBucket({
        serviceTypesCount,
        languagesCount,
        hasCoverage,
        hasCapacity: capacityStatus.toLowerCase() !== "unknown",
        hasIntakeMethods: intakeMethodsCount > 0,
      }),
      name: String(org.name ?? ""),
      acceptingClients: org.accepting_clients === true,
      capacityStatus,
      avgResponseTimeHours:
        org.avg_response_time_hours != null && org.avg_response_time_hours !== ""
          ? Number(org.avg_response_time_hours)
          : null,
      accessibilityFeaturesCount,
      languagesCount,
      intakeMethodsCount,
      serviceTypesCount,
      hasCoverage,
    },
    cases: {
      total: totalCases,
      active: activeCases.length,
      stale: staleCases.length,
      avgAgeDays: average(caseAges),
    },
    messaging: {
      orgCasesWithMessages: casesWithMessages.size,
      recentMessageThreads: recentMessageThreads.size,
      avgFirstReplyHours: average(firstReplyHours),
      replySignalConfidence: replyConfidence(firstReplyHours.length),
    },
    workflow: {
      routingUsageRate: clampRate(routingCaseSet.size, totalCases),
      completenessUsageRate: clampRate(completenessCaseSet.size, totalCases),
      ocrUsageRate: clampRate(ocrCaseSet.size, totalCases),
      appointmentsUsageRate,
    },
    completeness: {
      blockingIssueRate: clampRate(casesWithBlocking, latestCompletenessByCase.size),
      casesWithMissingDocsRate: clampRate(casesWithMissingDocs, latestCompletenessByCase.size),
    },
    flags,
  };
}

