"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { confidenceChipText, designationTierBadgeText } from "@/lib/trustDisplay";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES } from "@/lib/routes/pageRegistry";

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

type EcosystemOrgRow = {
  organization_id: string;
  organization_name: string;
  region_label: string;
  service_types: string[];
  capacity_status: string;
  accepting_clients: boolean;
  profile_status: string;
  profile_stage: string;
  designation_tier: string | null;
  designation_confidence: string | null;
  profile_completeness: string;
  virtual_services: boolean;
  routing_runs_in_window: number;
  completeness_runs_in_window: number;
  messages_sent_in_window: number;
  match_rows_as_target_in_window: number;
  internal_followup_cue: string;
};

export default function AdminEcosystemPage() {
  const [state, setState] = useState("");
  const [county, setCounty] = useState("");
  const [timeWindow, setTimeWindow] = useState("30");
  const [serviceType, setServiceType] = useState("");
  const [language, setLanguage] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [orgs, setOrgs] = useState<EcosystemOrgRow[]>([]);
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
        setOrgs(
          Array.isArray(d.organizations) ? (d.organizations as EcosystemOrgRow[]) : []
        );
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
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <PageHeader
          contextLine="Admin → Ecosystem"
          eyebrow="Admin · Internal only"
          title="Ecosystem"
          subtitle={
            <>
              Internal landscape: coverage, gaps, and organization readiness (not a public directory or
              leaderboard).{" "}
              <a href="/help/how-matching-works" className="text-teal-400 hover:underline">
                How matching works
              </a>
            </>
          }
          rightActions={
            <>
              <Link href="/admin/audit" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-charcoal)]">
                Audit
              </Link>
              <Link href="/admin/orgs" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-charcoal)]">
                Organizations
              </Link>
              <Link
                href="/admin/grading"
                className="inline-flex items-center rounded-md bg-[var(--color-teal-deep)] px-2.5 py-1 text-sm font-medium text-white hover:bg-[var(--color-teal)]"
              >
                Review
              </Link>
            </>
          }
        />

        <p className="text-xs text-[var(--color-muted)] border-l-2 border-[var(--color-border)] pl-3 py-1 max-w-3xl">
          This is an internal aggregated view. No victim-identifying data is shown.
        </p>

        {overview && s && (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(([label, val]) => (
              <div
                key={label}
                className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 p-4"
              >
                <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
                <p className="text-2xl font-semibold text-[var(--color-navy)] mt-1">{val}</p>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--color-charcoal)]">Filters</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-xs">
            <label className="space-y-1">
              <span className="text-[var(--color-muted)]">State</span>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-warm-white)] px-2 py-1.5 text-[var(--color-charcoal)]"
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
              <span className="text-[var(--color-muted)]">County (optional)</span>
              <input
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="e.g. cook"
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-warm-white)] px-2 py-1.5 text-[var(--color-charcoal)]"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[var(--color-muted)]">Time window (days)</span>
              <select
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-warm-white)] px-2 py-1.5 text-[var(--color-charcoal)]"
              >
                <option value="7">7</option>
                <option value="30">30</option>
                <option value="90">90</option>
                <option value="180">180</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[var(--color-muted)]">Service type</span>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-warm-white)] px-2 py-1.5 text-[var(--color-charcoal)]"
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
              <span className="text-[var(--color-muted)]">Language code</span>
              <input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="es, en…"
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-warm-white)] px-2 py-1.5 text-[var(--color-charcoal)]"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="text-xs rounded-lg bg-[var(--color-teal-deep)] px-3 py-1.5 text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
          >
            Refresh
          </button>
        </section>

        {err && (
          <p className="text-red-400 text-sm" role="alert">
            {err}
          </p>
        )}

        {loading && !overview && <p className="text-[var(--color-muted)] text-sm">Loading…</p>}

        {!loading && !err && !overview && (
          <p className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/75 px-4 py-3 text-sm text-[var(--color-muted)]">
            No ecosystem data for these filters. Try adjusting filters.
          </p>
        )}

        {overview && s && (
          <>
            <section className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-4">
              <h2 className="text-sm font-semibold text-[var(--color-charcoal)] mb-2">Demand–supply gaps</h2>
              <p className="text-[11px] text-[var(--color-muted)] mb-3 leading-relaxed">
                These are operational hints where demand signals and partner capacity may be misaligned — use
                them to prioritize outreach or profile follow-up, not to rank organizations.
              </p>
              {gaps.length === 0 ? (
                <p className="text-xs text-[var(--color-muted)]">
                  No gap signals for current filters. Try another state, service, or time window if you expect
                  activity.
                </p>
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
                            : "border-[var(--color-border)] bg-[var(--color-warm-cream)]/70"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-[var(--color-navy)]">{String(g.title)}</span>
                        <span className="text-[10px] uppercase text-[var(--color-muted)]">
                          {String(g.gap_type)} · {String(g.severity)}
                        </span>
                      </div>
                      <p className="text-[var(--color-muted)] text-xs leading-relaxed">{String(g.description)}</p>
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
              <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-4 lg:col-span-1">
                <h2 className="text-sm font-semibold text-[var(--color-charcoal)] mb-3">Demand (match runs, window)</h2>
                <p className="text-[10px] text-[var(--color-muted)] mb-2">Service types referenced in run inputs</p>
                <ul className="text-xs space-y-1 text-[var(--color-slate)] max-h-40 overflow-y-auto">
                  {Object.entries(
                    (overview.coverage as { demand_service_counts?: Record<string, number> })
                      ?.demand_service_counts || {}
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 12)
                    .map(([k, v]) => (
                      <li key={k} className="flex justify-between border-b border-[var(--color-border-light)] py-1">
                        <span>{k.replace(/_/g, " ")}</span>
                        <span>{v}</span>
                      </li>
                    ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-4">
                <h2 className="text-sm font-semibold text-[var(--color-charcoal)] mb-3">Capacity mix</h2>
                <ul className="text-xs space-y-1 text-[var(--color-slate)]">
                  {Object.entries(cap).map(([k, v]) => (
                    <li key={k} className="flex justify-between border-b border-[var(--color-border-light)] py-1">
                      <span>{k}</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-4">
                <h2 className="text-sm font-semibold text-[var(--color-charcoal)] mb-3">Designation mix</h2>
                <ul className="text-xs space-y-1 text-[var(--color-slate)]">
                  {Object.entries(des).map(([k, v]) => (
                    <li key={k} className="flex justify-between border-b border-[var(--color-border-light)] py-1">
                      <span>{k.replace(/_/g, " ")}</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-4">
                <h2 className="text-sm font-semibold text-[var(--color-charcoal)] mb-3">Profile completeness</h2>
                <ul className="text-xs space-y-1 text-[var(--color-slate)]">
                  {Object.entries(prof).map(([k, v]) => (
                    <li key={k} className="flex justify-between border-b border-[var(--color-border-light)] py-1">
                      <span>{k}</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-4">
                <h2 className="text-sm font-semibold text-[var(--color-charcoal)] mb-3">Org segments</h2>
                <ul className="text-xs space-y-1 text-[var(--color-slate)]">
                  {(overview.org_segments || []).map((seg) => (
                    <li
                      key={seg.key}
                      className="flex justify-between border-b border-[var(--color-border-light)] py-1"
                    >
                      <span>{seg.label}</span>
                      <span>{seg.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-4 overflow-x-auto">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--color-charcoal)]">
                    Organizations ({orgTotal} in view)
                  </h2>
                  <p className="text-[11px] text-[var(--color-muted)] mt-1 max-w-2xl">
                    Listed partners are active with searchable or enriched profile stages (same bar as
                    matching). Readiness and designation are context — not a scoreboard.
                  </p>
                </div>
                <Link
                  href="/admin/orgs"
                  className="text-xs text-teal-400/90 hover:text-teal-300 shrink-0"
                >
                  Open org directory →
                </Link>
              </div>
              {orgs.length === 0 ? (
                <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/70 px-4 py-5 text-sm text-[var(--color-muted)]">
                  <p className="font-medium text-[var(--color-slate)]">No organizations in this view.</p>
                  <p className="mt-2 text-xs text-[var(--color-muted)]">
                    No active, searchable organizations match the current filters. Try clearing state,
                    service, or language filters, or confirm partners have completed profile requirements.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-[11px] text-[var(--color-slate)] min-w-[960px]">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                      <th className="py-2 pr-2">Name</th>
                      <th className="py-2 pr-2">Stage</th>
                      <th className="py-2 pr-2">Profile</th>
                      <th className="py-2 pr-2">Region</th>
                      <th className="py-2 pr-2">Services</th>
                      <th className="py-2 pr-2">Availability</th>
                      <th className="py-2 pr-2">Designation</th>
                      <th className="py-2 pr-2">Completeness</th>
                      <th className="py-2 pr-2">Follow-up</th>
                      <th className="py-2 pr-2 text-right">Activity</th>
                      <th className="py-2 pr-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((o) => (
                      <tr key={o.organization_id} className="border-b border-[var(--color-border-light)] align-top">
                        <td className="py-2 pr-2 text-[var(--color-charcoal)] max-w-[120px]">
                          <span className="font-medium block truncate" title={o.organization_name}>
                            {o.organization_name}
                          </span>
                        </td>
                        <td className="py-2 pr-2 whitespace-nowrap text-[var(--color-muted)]">{o.profile_stage}</td>
                        <td className="py-2 pr-2 text-[var(--color-muted)]">{o.profile_status || "—"}</td>
                        <td className="py-2 pr-2 max-w-[100px] truncate">{o.region_label}</td>
                        <td className="py-2 pr-2 max-w-[140px] truncate">
                          {o.service_types?.join(", ") || "—"}
                        </td>
                        <td className="py-2 pr-2">
                          {o.capacity_status}
                          {o.accepting_clients ? " · accepting" : ""}
                          {o.virtual_services ? " · virtual" : ""}
                        </td>
                        <td className="py-2 pr-2 text-[11px] max-w-[120px]">
                          {o.designation_tier ? (
                            <div className="space-y-0.5">
                              <div className="text-[var(--color-slate)]">
                                {designationTierBadgeText(o.designation_tier) ??
                                  o.designation_tier.replace(/_/g, " ")}
                              </div>
                              {o.designation_confidence ? (
                                <div className="text-[var(--color-muted)] text-[10px] leading-tight">
                                  {confidenceChipText(o.designation_confidence)}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-[var(--color-muted)]">No designation yet</span>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-[var(--color-muted)]">{o.profile_completeness}</td>
                        <td className="py-2 pr-2 max-w-[200px] text-[var(--color-muted)] leading-snug">
                          {o.internal_followup_cue}
                        </td>
                        <td className="py-2 pr-2 text-right text-[var(--color-muted)] whitespace-nowrap">
                          R{o.routing_runs_in_window} C{o.completeness_runs_in_window} M
                          {o.messages_sent_in_window}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <Link
                              href={`${ROUTES.organizationSettings}?organization_id=${o.organization_id}`}
                              className="text-teal-400/90 hover:text-teal-300"
                            >
                              View
                            </Link>
                            <Link
                              href={`/admin/designations?org=${o.organization_id}`}
                              className="text-[var(--color-muted)] hover:text-[var(--color-slate)]"
                            >
                              Review designation
                            </Link>
                            <Link
                              href={`/admin/grading?org=${o.organization_id}`}
                              className="text-[var(--color-muted)] hover:text-[var(--color-slate)]"
                            >
                              Review grading
                            </Link>
                            <Link
                              href={`/admin/grading?org=${o.organization_id}#org-signals-snapshot`}
                              className="text-[var(--color-muted)] hover:text-[var(--color-slate)]"
                            >
                              Review signals
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
