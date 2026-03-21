"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { confidenceChipText, designationTierBadgeText } from "@/lib/trustDisplay";
import { PageHeader } from "@/components/layout/PageHeader";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
  "VA", "WA", "WV", "WI", "WY", "DC",
];

const SERVICE_TYPES = [
  "victim_compensation",
  "legal_aid",
  "therapy",
  "case_management",
  "housing_support",
  "emergency_funds",
  "hospital_advocacy",
];

type Overview = {
  filters: Record<string, unknown>;
  summary: Record<string, unknown>;
  coverage: Record<string, unknown>;
  demand_supply_gaps: Array<Record<string, unknown>>;
  org_segments: Array<{ key: string; label: string; count: number }>;
  region_flags: string[];
};

type OrgRow = Record<string, unknown>;

export default function AdminEcosystemPage() {
  const [state, setState] = useState("");
  const [county, setCounty] = useState("");
  const [timeWindow, setTimeWindow] = useState("30");
  const [serviceType, setServiceType] = useState("");
  const [language, setLanguage] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [orgTotal, setOrgTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.href = "/login";
        return;
      }
      const params = new URLSearchParams();
      if (state) params.set("state", state);
      if (county.trim()) params.set("county", county.trim());
      params.set("time_window_days", timeWindow || "30");
      if (serviceType) params.set("service_type", serviceType);
      if (language.trim()) params.set("language", language.trim().toLowerCase());

      const [ovRes, orgRes] = await Promise.all([
        fetch(`/api/admin/ecosystem/overview?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/ecosystem/organizations?${params}&limit=250`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!ovRes.ok) {
        const json = await ovRes.json().catch(() => null);
        setErr(getApiErrorMessage(json, "Failed to load ecosystem overview"));
        setOverview(null);
        setOrgs([]);
        return;
      }
      const ovJson = await ovRes.json();
      setOverview((ovJson.data ?? ovJson) as Overview);

      if (orgRes.ok) {
        const orgJson = await orgRes.json();
        const d = orgJson.data ?? orgJson;
        setOrgs(Array.isArray(d.organizations) ? d.organizations : []);
        setOrgTotal(typeof d.total === "number" ? d.total : 0);
      } else {
        setOrgs([]);
        setOrgTotal(0);
      }
    } catch {
      setErr("Unexpected error loading ecosystem data.");
    } finally {
      setLoading(false);
    }
  }, [state, county, timeWindow, serviceType, language]);

  useEffect(() => {
    load();
  }, [load]);

  const s = overview?.summary as Record<string, unknown> | undefined;
  const cap = (s?.capacity_distribution as Record<string, number>) || {};
  const des = (s?.designation_distribution as Record<string, number>) || {};
  const prof = (s?.profile_completeness_distribution as Record<string, number>) || {};
  const gaps = overview?.demand_supply_gaps || [];

  const summaryCards: [string, string][] = s
    ? [
        ["Active orgs (in view)", String(s.active_orgs ?? "—")],
        ["Accepting clients", String(s.accepting_clients_orgs ?? "—")],
        ["Match runs (window)", String(s.match_runs_in_window ?? "—")],
        ["Runs with no suggestions", String(s.match_runs_no_result ?? "—")],
        ["Cases created (window, state scope)", String(s.cases_created_in_window ?? "—")],
        ["Orgs with designation", String(s.orgs_with_current_designation ?? "—")],
        ["Routing runs (window)", String(s.routing_runs_in_window ?? "—")],
        ["Completeness runs", String(s.completeness_runs_in_window ?? "—")],
        ["Messages sent (window)", String(s.messaging_activity_in_window ?? "—")],
      ]
    : [];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <PageHeader
          contextLine="Admin → Ecosystem"
          eyebrow="Admin · Internal only"
          title="Ecosystem"
          subtitle={
            <>
              Overview of platform coverage, gaps, and organization distribution.{" "}
              <a href="/help/how-matching-works" className="text-teal-400 hover:underline">
                How matching works
              </a>
            </>
          }
          rightActions={
            <>
              <Link href="/admin/audit" className="text-sm text-slate-400 hover:text-slate-200">
                Audit
              </Link>
              <Link href="/admin/orgs" className="text-sm text-slate-400 hover:text-slate-200">
                Organizations
              </Link>
              <Link
                href="/admin/grading"
                className="inline-flex items-center rounded-md bg-slate-700 px-2.5 py-1 text-sm font-medium text-white hover:bg-slate-600"
              >
                Review
              </Link>
            </>
          }
        />

        <p className="text-xs text-slate-500 border-l-2 border-slate-700 pl-3 py-1 max-w-3xl">
          This is an internal aggregated view. No survivor-identifying data is shown.
        </p>

        {overview && s && (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(([label, val]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
                <p className="text-2xl font-semibold text-slate-100 mt-1">{val}</p>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Filters</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-xs">
            <label className="space-y-1">
              <span className="text-slate-500">State</span>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-200"
              >
                <option value="">All states</option>
                {US_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-slate-500">County (optional)</span>
              <input
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="e.g. cook"
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-200"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-500">Time window (days)</span>
              <select
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-200"
              >
                <option value="7">7</option>
                <option value="30">30</option>
                <option value="90">90</option>
                <option value="180">180</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-slate-500">Service type</span>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-200"
              >
                <option value="">Any</option>
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-slate-500">Language code</span>
              <input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="es, en…"
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-200"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="text-xs rounded-lg bg-slate-700 px-3 py-1.5 text-white hover:bg-slate-600 disabled:opacity-50"
          >
            Refresh
          </button>
        </section>

        {err && (
          <p className="text-red-400 text-sm" role="alert">
            {err}
          </p>
        )}

        {loading && !overview && <p className="text-slate-500 text-sm">Loading…</p>}

        {!loading && !err && !overview && (
          <p className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
            No ecosystem data for these filters. Try adjusting filters.
          </p>
        )}

        {overview && s && (
          <>
            <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h2 className="text-sm font-semibold text-slate-200 mb-3">Demand–supply gaps</h2>
              {gaps.length === 0 ? (
                <p className="text-xs text-slate-500">No gap signals for current filters.</p>
              ) : (
                <ul className="space-y-4">
                  {gaps.map((g, i) => (
                    <li
                      key={i}
                      className={`rounded-lg border p-3 text-sm ${
                        g.severity === "high"
                          ? "border-red-900/60 bg-red-950/20"
                          : g.severity === "medium"
                            ? "border-amber-900/50 bg-amber-950/15"
                            : "border-slate-700 bg-slate-950/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-slate-100">{String(g.title)}</span>
                        <span className="text-[10px] uppercase text-slate-500">
                          {String(g.gap_type)} · {String(g.severity)}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">{String(g.description)}</p>
                      <p className="text-teal-400/90 text-[11px] mt-2">{String(g.action_hint)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {(overview.region_flags?.length ?? 0) > 0 && (
              <section className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
                <h2 className="text-sm font-semibold text-amber-200 mb-2">Region notes</h2>
                <ul className="text-sm text-amber-100/90 list-disc list-inside space-y-1">
                  {overview.region_flags.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 lg:col-span-1">
                <h2 className="text-sm font-semibold text-slate-200 mb-3">Demand (match runs, window)</h2>
                <p className="text-[10px] text-slate-500 mb-2">Service types referenced in run inputs</p>
                <ul className="text-xs space-y-1 text-slate-300 max-h-40 overflow-y-auto">
                  {Object.entries(
                    (overview.coverage as { demand_service_counts?: Record<string, number> })
                      ?.demand_service_counts || {}
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 12)
                    .map(([k, v]) => (
                      <li key={k} className="flex justify-between border-b border-slate-800/80 py-1">
                        <span>{k.replace(/_/g, " ")}</span>
                        <span>{v}</span>
                      </li>
                    ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <h2 className="text-sm font-semibold text-slate-200 mb-3">Capacity mix</h2>
                <ul className="text-xs space-y-1 text-slate-300">
                  {Object.entries(cap).map(([k, v]) => (
                    <li key={k} className="flex justify-between border-b border-slate-800/80 py-1">
                      <span>{k}</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <h2 className="text-sm font-semibold text-slate-200 mb-3">Designation mix</h2>
                <ul className="text-xs space-y-1 text-slate-300">
                  {Object.entries(des).map(([k, v]) => (
                    <li key={k} className="flex justify-between border-b border-slate-800/80 py-1">
                      <span>{k.replace(/_/g, " ")}</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <h2 className="text-sm font-semibold text-slate-200 mb-3">Profile completeness</h2>
                <ul className="text-xs space-y-1 text-slate-300">
                  {Object.entries(prof).map(([k, v]) => (
                    <li key={k} className="flex justify-between border-b border-slate-800/80 py-1">
                      <span>{k}</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <h2 className="text-sm font-semibold text-slate-200 mb-3">Org segments</h2>
                <ul className="text-xs space-y-1 text-slate-300">
                  {(overview.org_segments || []).map((seg) => (
                    <li
                      key={seg.key}
                      className="flex justify-between border-b border-slate-800/80 py-1"
                    >
                      <span>{seg.label}</span>
                      <span>{seg.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 overflow-x-auto">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-200">
                  Organizations ({orgTotal} in view)
                </h2>
              </div>
              <table className="w-full text-left text-[11px] text-slate-300 min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-500">
                    <th className="py-2 pr-2">Name</th>
                    <th className="py-2 pr-2">Region</th>
                    <th className="py-2 pr-2">Services</th>
                    <th className="py-2 pr-2">Capacity</th>
                    <th className="py-2 pr-2">Designation</th>
                    <th className="py-2 pr-2">Profile</th>
                    <th className="py-2 pr-2 text-right">Workflow</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((o) => (
                    <tr key={String(o.organization_id)} className="border-b border-slate-800/80">
                      <td className="py-2 pr-2 text-slate-200 max-w-[140px] truncate">
                        {String(o.organization_name)}
                      </td>
                      <td className="py-2 pr-2 max-w-[100px] truncate">{String(o.region_label)}</td>
                      <td className="py-2 pr-2 max-w-[160px] truncate">
                        {(o.service_types as string[])?.join(", ") || "—"}
                      </td>
                      <td className="py-2 pr-2">
                        {String(o.capacity_status)}
                        {o.accepting_clients ? " · open intake" : ""}
                      </td>
                      <td className="py-2 pr-2 text-[11px] max-w-[140px]">
                        {o.designation_tier ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-200 font-medium">
                              {designationTierBadgeText(String(o.designation_tier)) ??
                                String(o.designation_tier).replace(/_/g, " ")}
                            </div>
                            {o.designation_confidence ? (
                              <div className="text-slate-500 text-[10px] leading-tight">
                                {confidenceChipText(String(o.designation_confidence))}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-2">{String(o.profile_completeness)}</td>
                      <td className="py-2 pr-2 text-right text-slate-500 whitespace-nowrap">
                        R{Number(o.routing_runs_in_window)} C{Number(o.completeness_runs_in_window)} M
                        {Number(o.messages_sent_in_window)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
