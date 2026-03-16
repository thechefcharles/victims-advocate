"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type CasePriority = "critical" | "high" | "medium" | "low";
type CompletenessStatus =
  | "complete"
  | "mostly_complete"
  | "incomplete"
  | "insufficient_information"
  | "not_evaluated";

type CaseAlert = {
  alert_type: string;
  severity: string;
  case_id: string;
  title: string;
  description: string;
  reason_codes: string[];
  action_hint: string;
  created_at: string;
};

type CaseSummaryEnriched = {
  id: string;
  status: string;
  victim_name: string;
  assigned_advocate_id: string | null;
  assigned_advocate_email?: string | null;
  priority: CasePriority;
  priority_reasons: string[];
  alert_count: number;
  alerts: CaseAlert[];
  last_activity_at: string | null;
  routing_status: "evaluated" | "not_evaluated";
  completeness_status: CompletenessStatus;
  completeness_blocking_count: number;
  ocr_warning: boolean;
  access: { role: string; can_view: boolean; can_edit: boolean };
};

type WorkloadByAdvocate = {
  user_id: string;
  email: string | null;
  case_count: number;
  high_priority_count: number;
  blocking_completeness_count: number;
  unassigned_pool_count: number;
};

type CommandCenterResponse = {
  summary: {
    active_case_count: number;
    unassigned_case_count: number;
    high_priority_count: number;
    blocking_completeness_count: number;
    ocr_warning_count: number;
    recently_updated_count: number;
  };
  alerts: CaseAlert[];
  cases: CaseSummaryEnriched[];
  workload: WorkloadByAdvocate[];
};

const PRIORITY_LABEL: Record<CasePriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const PRIORITY_CLASS: Record<CasePriority, string> = {
  critical: "bg-red-500/20 text-red-300 border-red-500/40",
  high: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  medium: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  low: "bg-slate-500/20 text-slate-400 border-slate-500/40",
};

const COMPLETENESS_LABEL: Record<string, string> = {
  complete: "Complete",
  mostly_complete: "Mostly complete",
  incomplete: "Incomplete",
  insufficient_information: "Insufficient info",
  not_evaluated: "Not evaluated",
};

export default function AdvocateDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CommandCenterResponse | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [onlyWithAlerts, setOnlyWithAlerts] = useState(false);
  const [sort, setSort] = useState<
    "priority" | "last_activity" | "status" | "created_at"
  >("priority");

  const load = useCallback(
    async (searchOverride?: string) => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          window.location.href = "/login";
          return;
        }
        const appliedSearch = searchOverride !== undefined ? searchOverride : search;
        const params = new URLSearchParams();
        if (appliedSearch.trim()) params.set("search", appliedSearch.trim());
        if (statusFilter) params.set("status", statusFilter);
        if (priorityFilter) params.set("priority", priorityFilter);
        if (onlyUnassigned) params.set("only_unassigned", "true");
        if (onlyWithAlerts) params.set("only_with_alerts", "true");
        params.set("sort", sort);
        const res = await fetch(
          `/api/advocate/command-center?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      if (!res.ok) {
        console.error("Command center load failed:", await res.text());
        setData(null);
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Command center load error", e);
      setData(null);
    } finally {
      setLoading(false);
    }
    },
    [search, statusFilter, priorityFilter, onlyUnassigned, onlyWithAlerts, sort]
  );

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
        <div className="max-w-6xl mx-auto">Loading command center…</div>
      </main>
    );
  }

  const summary = data?.summary ?? {
    active_case_count: 0,
    unassigned_case_count: 0,
    high_priority_count: 0,
    blocking_completeness_count: 0,
    ocr_warning_count: 0,
    recently_updated_count: 0,
  };
  const alerts = data?.alerts ?? [];
  const cases = data?.cases ?? [];
  const workload = data?.workload ?? [];

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            Advocate
          </p>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">Command center</h1>
            <Link
              href="/advocate/org"
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Manage organization →
            </Link>
          </div>
          <p className="text-sm text-slate-300">
            Prioritized work queue and org summary. Use filters and search to focus.
          </p>
        </header>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">
              Active cases
            </div>
            <div className="text-xl font-semibold text-slate-100 mt-0.5">
              {summary.active_case_count}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">
              Unassigned
            </div>
            <div className="text-xl font-semibold text-amber-300 mt-0.5">
              {summary.unassigned_case_count}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">
              High priority
            </div>
            <div className="text-xl font-semibold text-red-300 mt-0.5">
              {summary.high_priority_count}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">
              Blocking issues
            </div>
            <div className="text-xl font-semibold text-slate-100 mt-0.5">
              {summary.blocking_completeness_count}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">
              OCR warnings
            </div>
            <div className="text-xl font-semibold text-slate-100 mt-0.5">
              {summary.ocr_warning_count}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">
              Recently updated
            </div>
            <div className="text-xl font-semibold text-slate-100 mt-0.5">
              {summary.recently_updated_count}
            </div>
          </div>
        </div>

        {/* Priority alerts */}
        {alerts.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-slate-300 mb-2">
              Priority alerts
            </h2>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2 max-h-48 overflow-y-auto">
              {alerts.slice(0, 15).map((a, i) => (
                <div
                  key={`${a.case_id}-${a.alert_type}-${i}`}
                  className="flex items-start justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="text-slate-400 font-medium">{a.title}</span>
                    <span className="text-slate-500 ml-1">— {a.description}</span>
                    {a.reason_codes?.length > 0 && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {a.reason_codes.join(", ")}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/compensation/intake?case=${a.case_id}`}
                    className="shrink-0 text-emerald-400 hover:underline"
                  >
                    Open case →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Search and filters */}
        <section>
          <h2 className="text-sm font-medium text-slate-300 mb-2">
            Case work queue
          </h2>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input
              type="search"
              placeholder="Search by case ID or victim name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const q = searchInput.trim();
                  setSearch(q);
                  load(q);
                }
              }}
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 min-w-[200px]"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-sm text-slate-200"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="ready_for_review">Ready for review</option>
              <option value="submitted">Submitted</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-sm text-slate-200"
            >
              <option value="">All priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={sort}
              onChange={(e) =>
                setSort(
                  e.target.value as
                    | "priority"
                    | "last_activity"
                    | "status"
                    | "created_at"
                )
              }
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-sm text-slate-200"
            >
              <option value="priority">Sort by priority</option>
              <option value="last_activity">Sort by last activity</option>
              <option value="status">Sort by status</option>
              <option value="created_at">Sort by created</option>
            </select>
            <label className="flex items-center gap-1.5 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={onlyUnassigned}
                onChange={(e) => setOnlyUnassigned(e.target.checked)}
                className="rounded border-slate-600"
              />
              Unassigned only
            </label>
            <label className="flex items-center gap-1.5 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={onlyWithAlerts}
                onChange={(e) => setOnlyWithAlerts(e.target.checked)}
                className="rounded border-slate-600"
              />
              With alerts only
            </label>
            <button
              type="button"
              onClick={() => {
                const q = searchInput.trim();
                setSearch(q);
                load(q);
              }}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
            >
              Apply
            </button>
          </div>

          {cases.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm text-slate-300">
              No cases match the current filters. Broaden search or clear filters.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800 bg-slate-900/50">
                      <th className="text-left py-2.5 px-3">Victim / Case</th>
                      <th className="text-left py-2.5 px-3">Status</th>
                      <th className="text-left py-2.5 px-3">Assigned</th>
                      <th className="text-left py-2.5 px-3">Priority</th>
                      <th className="text-left py-2.5 px-3">Completeness</th>
                      <th className="text-left py-2.5 px-3">Routing</th>
                      <th className="text-left py-2.5 px-3">Last activity</th>
                      <th className="text-left py-2.5 px-3">Alerts</th>
                      <th className="text-left py-2.5 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-slate-900 hover:bg-slate-900/30"
                      >
                        <td className="py-2 px-3">
                          <Link
                            href={`/compensation/intake?case=${c.id}`}
                            className="font-semibold text-slate-100 hover:text-emerald-300 hover:underline underline-offset-2"
                          >
                            {c.victim_name}
                          </Link>
                          <div className="text-[11px] text-slate-500">
                            {c.id.slice(0, 8)}…
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-200">
                          {c.status.replace(/_/g, " ")}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {c.assigned_advocate_id
                            ? (c.assigned_advocate_email ||
                                c.assigned_advocate_id.slice(0, 8) + "…")
                            : "—"}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-block rounded border px-1.5 py-0.5 ${PRIORITY_CLASS[c.priority]}`}
                            title={c.priority_reasons.join("; ")}
                          >
                            {PRIORITY_LABEL[c.priority]}
                          </span>
                          {c.priority_reasons.length > 0 && (
                            <div
                              className="text-[11px] text-slate-500 mt-0.5 max-w-[120px] truncate"
                              title={c.priority_reasons.join("; ")}
                            >
                              {c.priority_reasons[0]}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {COMPLETENESS_LABEL[c.completeness_status] ??
                            c.completeness_status}
                          {c.completeness_blocking_count > 0 && (
                            <span className="text-amber-400 ml-1">
                              ({c.completeness_blocking_count} blocking)
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {c.routing_status === "evaluated"
                            ? "Evaluated"
                            : "Not evaluated"}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {formatDate(c.last_activity_at)}
                        </td>
                        <td className="py-2 px-3">
                          {c.ocr_warning && (
                            <span className="text-amber-400 mr-1" title="OCR inconsistency">
                              ⚠
                            </span>
                          )}
                          {c.alert_count > 0 ? (
                            <span
                              className="text-slate-300"
                              title={c.alerts.map((a) => a.title).join("; ")}
                            >
                              {c.alert_count}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <Link
                            href={`/compensation/intake?case=${c.id}`}
                            className="text-emerald-400 hover:underline"
                          >
                            Open →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Workload by advocate */}
        {workload.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-slate-300 mb-2">
              Workload by advocate
            </h2>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 bg-slate-900/50">
                    <th className="text-left py-2 px-3">Advocate</th>
                    <th className="text-right py-2 px-3">Cases</th>
                    <th className="text-right py-2 px-3">High priority</th>
                    <th className="text-right py-2 px-3">Blocking</th>
                    <th className="text-right py-2 px-3">Unassigned pool</th>
                  </tr>
                </thead>
                <tbody>
                  {workload.map((w) => (
                    <tr
                      key={w.user_id || "unassigned"}
                      className="border-b border-slate-900"
                    >
                      <td className="py-2 px-3 text-slate-200">
                        {w.user_id
                          ? w.email || w.user_id.slice(0, 8) + "…"
                          : "Unassigned"}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300">
                        {w.case_count}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300">
                        {w.high_priority_count}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300">
                        {w.blocking_completeness_count}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300">
                        {w.unassigned_pool_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <p className="text-[11px] text-slate-500">
          Priority and alerts are derived from routing, completeness, OCR, and
          documents. Open a case to edit or run evaluations.
        </p>
      </div>
    </main>
  );
}
