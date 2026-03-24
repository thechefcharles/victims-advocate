/**
 * Phase 14: Load and enrich case data for command center (routing, completeness, OCR, timeline, documents, assignment).
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AuthContext } from "@/lib/server/auth";
import { isOrgLeadership } from "@/lib/server/auth";
import { listCasesForUser, listCasesForOrganization } from "@/lib/server/data";
import type { CaseRow, CaseListItem } from "@/lib/server/data";
import { aggregateAlertsForCase, type AlertInputs } from "./alerts";
import { deriveCasePriority } from "./priority";
import type {
  CaseSummaryEnriched,
  CaseAlert,
  CommandCenterSummary,
  CommandCenterResponse,
  WorkloadByAdvocate,
} from "./types";
import type { CompletenessRunResult } from "@/lib/server/completeness/types";
import type { OcrResultSummary } from "@/lib/server/ocr/types";

const RECENT_MS = 2 * 24 * 60 * 60 * 1000;

function latestByCase<T extends { case_id: string; created_at: string }>(
  rows: T[]
): Map<string, T> {
  const map = new Map<string, T>();
  for (const r of rows) {
    const existing = map.get(r.case_id);
    if (!existing || new Date(r.created_at) > new Date(existing.created_at))
      map.set(r.case_id, r);
  }
  return map;
}

function victimNameFromApplication(application: unknown): string {
  if (application == null || typeof application !== "object") return "Unknown victim";
  const v = (application as Record<string, unknown>).victim as Record<string, unknown> | undefined;
  if (!v) return "Unknown victim";
  const first = (v.firstName as string) ?? "";
  const last = (v.lastName as string) ?? "";
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || "Unknown victim";
}

export type CommandCenterFilters = {
  status?: string;
  assigned_to?: string;
  priority?: string;
  search?: string;
  only_unassigned?: boolean;
  only_with_alerts?: boolean;
};

export type CommandCenterSort =
  | "priority"
  | "last_activity"
  | "status"
  | "created_at";

export async function loadCommandCenterData(params: {
  ctx: AuthContext;
  filters?: CommandCenterFilters;
  sort?: CommandCenterSort;
}): Promise<CommandCenterResponse> {
  const { ctx, filters = {}, sort = "priority" } = params;
  const supabase = getSupabaseAdmin();

  const canSeeOrgWide = ctx.isAdmin || isOrgLeadership(ctx.orgRole);

  let caseList: CaseListItem[];
  if (canSeeOrgWide && ctx.orgId) {
    const rows = await listCasesForOrganization({ organizationId: ctx.orgId });
    caseList = rows.map((c) => ({
      ...c,
      access: { role: "advocate", can_view: true, can_edit: true },
    })) as CaseListItem[];
  } else {
    caseList = await listCasesForUser({ ctx, filters: { role: "advocate" } });
  }

  const caseIds = caseList.map((c) => c.id);
  if (caseIds.length === 0) {
    return {
      summary: {
        active_case_count: 0,
        unassigned_case_count: 0,
        high_priority_count: 0,
        blocking_completeness_count: 0,
        ocr_warning_count: 0,
        recently_updated_count: 0,
      },
      alerts: [],
      cases: [],
      workload: [],
    };
  }

  const [
    routingRows,
    completenessRows,
    ocrRows,
    timelineRows,
    docCounts,
    advocateAccess,
    unreadSurvivorByCase,
  ] =
    await Promise.all([
      supabase
        .from("routing_runs")
        .select("id, case_id, created_at")
        .in("case_id", caseIds)
        .order("created_at", { ascending: false })
        .then((r) => (r.data ?? []) as Array<{ id: string; case_id: string; created_at: string }>),
      supabase
        .from("completeness_runs")
        .select("id, case_id, created_at, result")
        .in("case_id", caseIds)
        .order("created_at", { ascending: false })
        .then((r) => (r.data ?? []) as Array<{ id: string; case_id: string; created_at: string; result: CompletenessRunResult }>),
      supabase
        .from("ocr_runs")
        .select("id, case_id, result_summary, status")
        .in("case_id", caseIds)
        .eq("status", "completed")
        .then((r) => (r.data ?? []) as Array<{ case_id: string; result_summary: OcrResultSummary | null }>),
      supabase
        .from("case_timeline_events")
        .select("case_id, created_at")
        .in("case_id", caseIds)
        .order("created_at", { ascending: false })
        .then((r) => (r.data ?? []) as Array<{ case_id: string; created_at: string }>),
      supabase
        .from("documents")
        .select("case_id, status")
        .in("case_id", caseIds)
        .in("status", ["active", "deleted", "restricted"])
        .then((r) => {
          const data = (r.data ?? []) as Array<{ case_id: string; status: string }>;
          const byCase = new Map<string, { total: number; restricted: number }>();
          for (const d of data) {
            const cur = byCase.get(d.case_id) ?? { total: 0, restricted: 0 };
            cur.total += 1;
            if (d.status === "restricted") cur.restricted += 1;
            byCase.set(d.case_id, cur);
          }
          return byCase;
        }),
      supabase
        .from("case_access")
        .select("case_id, user_id")
        .in("case_id", caseIds)
        .eq("role", "advocate")
        .then((r) => {
          const data = (r.data ?? []) as Array<{ case_id: string; user_id: string }>;
          const firstByCase = new Map<string, string>();
          for (const row of data) {
            if (!firstByCase.has(row.case_id)) firstByCase.set(row.case_id, row.user_id);
          }
          return firstByCase;
        }),
      supabase
        .from("case_messages")
        .select("id, case_id, sender_role, sender_user_id, status")
        .in("case_id", caseIds)
        .neq("status", "deleted")
        .then(async (r) => {
          const msgs = (r.data ?? []) as Array<{
            id: string;
            case_id: string;
            sender_role: string | null;
            sender_user_id: string;
            status: string;
          }>;

          const survivorMsgs = msgs.filter((m) => (m.sender_role ?? "").toLowerCase() === "victim");
          if (survivorMsgs.length === 0) return new Map<string, number>();

          const ids = survivorMsgs.map((m) => m.id);
          const { data: reads } = await supabase
            .from("message_reads")
            .select("message_id")
            .in("message_id", ids)
            .eq("user_id", ctx.userId);
          const readSet = new Set((reads ?? []).map((x: any) => x.message_id as string));

          const byCase = new Map<string, number>();
          for (const m of survivorMsgs) {
            if (readSet.has(m.id)) continue;
            byCase.set(m.case_id, (byCase.get(m.case_id) ?? 0) + 1);
          }
          return byCase;
        }),
    ]);

  const latestRouting = latestByCase(routingRows);
  const latestCompleteness = latestByCase(completenessRows);
  const latestTimeline = latestByCase(timelineRows);

  const ocrWarningByCase = new Set<string>();
  for (const row of ocrRows) {
    const sum = row.result_summary;
    if (
      (sum?.inconsistencies?.length ?? 0) > 0 ||
      (sum?.warnings?.length ?? 0) > 0
    )
      ocrWarningByCase.add(row.case_id);
  }

  const caseMap = new Map(caseList.map((c) => [c.id, c]));
  const enriched: CaseSummaryEnriched[] = [];
  const allAlerts: CaseAlert[] = [];

  for (const c of caseList) {
    const caseId = c.id as string;
    const orgId = (c as CaseRow).organization_id as string;
    const status = (c as CaseRow).status as string;
    const routing = latestRouting.get(caseId);
    const comp = latestCompleteness.get(caseId);
    const compResult = comp?.result;
    const completenessStatus = compResult?.overall_status ?? null;
    const completenessBlocking =
      compResult?.summary_counts?.blocking_count ?? 0;
    const lastActivity = latestTimeline.get(caseId)?.created_at ?? null;
    const docInfo = docCounts.get(caseId) ?? { total: 0, restricted: 0 };
    const assignedAdvocateId = advocateAccess.get(caseId) ?? null;
    const ocrWarning = ocrWarningByCase.has(caseId);
    const unreadSurvivorCount = unreadSurvivorByCase.get(caseId) ?? 0;

    const alertInputs: AlertInputs = {
      case_id: caseId,
      organization_id: orgId,
      status,
      has_routing: !!routing,
      routing_evaluated_at: routing?.created_at ?? null,
      completeness_status: completenessStatus,
      completeness_blocking_count: completenessBlocking,
      completeness_evaluated_at: comp?.created_at ?? null,
      ocr_has_inconsistencies: ocrWarning,
      ocr_warning_count: ocrWarning ? 1 : 0,
      document_count: docInfo.total,
      restricted_document_count: docInfo.restricted,
      assigned_advocate_id: assignedAdvocateId,
      last_activity_at: lastActivity,
      unread_survivor_message_count: unreadSurvivorCount,
      missing_required_docs:
        compResult?.missing_items?.some(
          (i) => i.severity === "blocking" && i.type === "missing_document"
        ) ?? false,
      missing_required_fields:
        compResult?.missing_items?.some(
          (i) => i.severity === "blocking" && i.type === "missing_field"
        ) ?? false,
    };

    const alerts = aggregateAlertsForCase(alertInputs);
    for (const a of alerts) allAlerts.push(a);

    const { priority, reasons } = deriveCasePriority({
      alerts,
      completeness_status: completenessStatus,
      completeness_blocking_count: completenessBlocking,
      restricted_document_count: docInfo.restricted,
      status,
      has_routing: !!routing,
      has_completeness: !!comp,
      assigned_advocate_id: assignedAdvocateId,
    });

    const victimName = victimNameFromApplication((c as CaseRow).application);
    enriched.push({
      id: caseId,
      organization_id: orgId,
      status,
      created_at: (c as CaseRow).created_at as string,
      updated_at: (c as CaseRow).updated_at as string,
      owner_user_id: (c as CaseRow).owner_user_id as string | null,
      application: (c as CaseRow).application as Record<string, unknown> | null,
      access: c.access,
      victim_name: victimName,
      assigned_advocate_id: assignedAdvocateId,
      assigned_advocate_email: null,
      priority,
      priority_reasons: reasons,
      alert_count: alerts.length,
      alerts,
      last_activity_at: lastActivity,
      routing_status: routing ? "evaluated" : "not_evaluated",
      routing_evaluated_at: routing?.created_at ?? null,
      completeness_status: completenessStatus ?? "not_evaluated",
      completeness_evaluated_at: comp?.created_at ?? null,
      completeness_blocking_count: completenessBlocking,
      ocr_warning: ocrWarning,
      document_count: docInfo.total,
      restricted_document_count: docInfo.restricted,
    });
  }

  let filtered = enriched;

  if (filters.status) {
    const s = filters.status.trim().toLowerCase();
    filtered = filtered.filter((c) => c.status.toLowerCase() === s);
  }
  if (filters.assigned_to) {
    const id = filters.assigned_to.trim();
    filtered = filtered.filter((c) => c.assigned_advocate_id === id);
  }
  if (filters.priority) {
    const p = filters.priority.trim().toLowerCase();
    filtered = filtered.filter((c) => c.priority === p);
  }
  if (filters.only_unassigned) {
    filtered = filtered.filter((c) => !c.assigned_advocate_id);
  }
  if (filters.only_with_alerts) {
    filtered = filtered.filter((c) => c.alert_count > 0);
  }
  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.victim_name.toLowerCase().includes(q)
    );
  }

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  if (sort === "priority") {
    filtered = [...filtered].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  } else if (sort === "last_activity") {
    filtered = [...filtered].sort((a, b) => {
      const ta = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
      const tb = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
      return tb - ta;
    });
  } else if (sort === "status") {
    filtered = [...filtered].sort((a, b) =>
      a.status.localeCompare(b.status)
    );
  } else {
    filtered = [...filtered].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  const active = enriched.filter(
    (c) => c.status !== "closed" && c.status !== "submitted"
  );
  const summary: CommandCenterSummary = {
    active_case_count: active.length,
    unassigned_case_count: active.filter((c) => !c.assigned_advocate_id).length,
    high_priority_count: active.filter(
      (c) => c.priority === "critical" || c.priority === "high"
    ).length,
    blocking_completeness_count: active.filter(
      (c) => c.completeness_blocking_count > 0
    ).length,
    ocr_warning_count: active.filter((c) => c.ocr_warning).length,
    recently_updated_count: active.filter((c) => {
      if (!c.last_activity_at) return false;
      return Date.now() - new Date(c.last_activity_at).getTime() < RECENT_MS;
    }).length,
  };

  const topAlerts = [...allAlerts]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 50);

  const workloadMap = new Map<string, WorkloadByAdvocate>();
  const unassignedKey = "__unassigned__";
  workloadMap.set(unassignedKey, {
    user_id: "",
    email: null,
    case_count: 0,
    high_priority_count: 0,
    blocking_completeness_count: 0,
    unassigned_pool_count: 0,
  });
  for (const c of active) {
    const key = c.assigned_advocate_id ?? unassignedKey;
    let w = workloadMap.get(key);
    if (!w) {
      workloadMap.set(key, (w = {
        user_id: key === unassignedKey ? "" : key,
        email: null,
        case_count: 0,
        high_priority_count: 0,
        blocking_completeness_count: 0,
        unassigned_pool_count: 0,
      }));
    }
    w.case_count += 1;
    if (c.priority === "critical" || c.priority === "high") w.high_priority_count += 1;
    if (c.completeness_blocking_count > 0) w.blocking_completeness_count += 1;
    if (!c.assigned_advocate_id) w.unassigned_pool_count += 1;
  }
  const workload: WorkloadByAdvocate[] = [];
  for (const [key, w] of workloadMap) {
    if (key === unassignedKey) continue;
    workload.push(w);
  }
  const unassignedRow = workloadMap.get(unassignedKey);
  if (unassignedRow && unassignedRow.case_count > 0) {
    workload.push({
      user_id: "",
      email: null,
      case_count: unassignedRow.case_count,
      high_priority_count: unassignedRow.high_priority_count,
      blocking_completeness_count: unassignedRow.blocking_completeness_count,
      unassigned_pool_count: unassignedRow.case_count,
    });
  }

  return {
    summary,
    alerts: topAlerts,
    cases: filtered,
    workload,
  };
}
