"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { ORG_GRADING_VERSION } from "@/lib/grading/version";

type Org = { id: string; name: string; type: string; status: string };
type OrganizationSignals = {
  organizationId: string;
  computedAt: string;
  profile: {
    profileStatus: string | null;
    profileStage: string | null;
    lastProfileUpdate: string | null;
    completeness: "minimal" | "partial" | "complete" | null;
  };
  cases: {
    total: number;
    active: number;
    stale: number;
    avgAgeDays: number | null;
  };
  messaging: {
    orgCasesWithMessages: number;
    recentMessageThreads: number;
    avgFirstReplyHours: number | null;
    replySignalConfidence: "low" | "medium" | "high";
  };
  workflow: {
    routingUsageRate: number | null;
    completenessUsageRate: number | null;
    ocrUsageRate: number | null;
    appointmentsUsageRate: number | null;
  };
  completeness: {
    blockingIssueRate: number | null;
    casesWithMissingDocsRate: number | null;
  };
  flags: string[];
};

type CatDetail = {
  score: number;
  weight: number;
  weighted_score: number;
  confidence: string;
  reasons: string[];
};

type ScoreRow = {
  id: string;
  computed_at: string;
  score_version: string;
  overall_score: number;
  score_confidence: string;
  category_scores: Record<string, CatDetail>;
  inputs_summary: Record<string, unknown>;
  flags: string[];
  status: string;
};

export default function AdminGradingPage() {
  const searchParams = useSearchParams();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [current, setCurrent] = useState<ScoreRow | null>(null);
  const [history, setHistory] = useState<ScoreRow[]>([]);
  const [signals, setSignals] = useState<OrganizationSignals | null>(null);

  const loadOrgs = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const res = await fetch("/api/admin/orgs", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setErr(
        getApiErrorMessage(
          json,
          "We couldn't load organizations for grading. Refresh the page and try again.",
        ),
      );
      return;
    }
    const json = await res.json();
    const list = (json.data?.orgs ?? []) as Org[];
    setOrgs(list);
    setErr(null);
  };

  const loadScore = async (id: string) => {
    if (!id) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch(`/api/admin/grading/org/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setCurrent(null);
      setHistory([]);
      return;
    }
    const json = await res.json();
    const d = json.data ?? json;
    setCurrent((d.current as ScoreRow) ?? null);
    setHistory((d.history as ScoreRow[]) ?? []);
  };

  const loadSignals = async (id: string) => {
    if (!id) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch(`/api/admin/org-signals/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setSignals(null);
      return;
    }
    const json = await res.json().catch(() => null);
    setSignals((json?.data?.signals as OrganizationSignals | null) ?? null);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadOrgs();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (orgs.length === 0) return;
    const fromUrl = searchParams.get("org")?.trim();
    if (fromUrl && orgs.some((o) => o.id === fromUrl)) {
      setOrgId(fromUrl);
      return;
    }
    setOrgId((prev) => prev || orgs[0]!.id);
  }, [orgs, searchParams]);

  useEffect(() => {
    if (!orgId) return;
    loadScore(orgId);
    loadSignals(orgId);
  }, [orgId]);

  const runGrading = async (force: boolean) => {
    if (!orgId) return;
    setRunning(true);
    setErr(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/admin/grading/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ organization_id: orgId, force_recompute: force }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(
          getApiErrorMessage(
            json,
            "Grading didn't finish — the server may be busy. Wait a moment and run it again.",
          ),
        );
        return;
      }
      await loadScore(orgId);
      await loadSignals(orgId);
    } finally {
      setRunning(false);
    }
  };

  const runAll = async () => {
    setBatchRunning(true);
    setErr(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/admin/grading/run-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ max_orgs: 30 }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(
          getApiErrorMessage(
            json,
            "Batch grading didn't finish. Try a smaller batch or wait and run it again.",
          ),
        );
        return;
      }
      if (orgId) {
        await loadScore(orgId);
        await loadSignals(orgId);
      }
    } finally {
      setBatchRunning(false);
    }
  };

  const cats = current?.category_scores
    ? Object.entries(current.category_scores)
    : [];

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-[var(--color-muted)]">
              Admin · Internal only
            </p>
            <h1 className="text-2xl font-bold">CBO quality grading</h1>
            <p className="text-sm text-[var(--color-muted)] mt-1 max-w-2xl leading-relaxed">
              Internal scoring supports designation mapping — scores are not shown to victims or the
              public. Version <code className="text-violet-300">{ORG_GRADING_VERSION}</code> — not
              public, not used in matching.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm items-center">
            <Link href="/admin/orgs" className="text-[var(--color-muted)] hover:text-[var(--color-charcoal)]">
              ← Orgs
            </Link>
            <Link href="/admin/cases" className="text-[var(--color-muted)] hover:text-[var(--color-charcoal)]">
              Cases
            </Link>
            <Link href="/admin/designations" className="text-teal-400 hover:text-teal-200">
              Review designation
            </Link>
          </div>
        </header>

        {err && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--color-charcoal)]">Organization</h2>
          {loading ? (
            <p className="text-sm text-[var(--color-muted)]">Loading…</p>
          ) : (
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-navy)] min-w-[240px]"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={running || !orgId}
                onClick={() => runGrading(false)}
                className="rounded-lg bg-[var(--color-teal-deep)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
              >
                {running ? "…" : "Load / compute if missing"}
              </button>
              <button
                type="button"
                disabled={running || !orgId}
                onClick={() => runGrading(true)}
                className="rounded-lg bg-[var(--color-teal-deep)] px-4 py-2 text-sm text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
              >
                Force recompute
              </button>
              <button
                type="button"
                disabled={batchRunning}
                onClick={runAll}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-slate)] hover:bg-[var(--color-light-sand)] disabled:opacity-50"
              >
                {batchRunning ? "Batch…" : "Run all (cap 30)"}
              </button>
            </div>
          )}
        </section>

        {current && (
          <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-charcoal)]">Latest score</h2>
            <div className="flex flex-wrap gap-6 items-baseline">
              <div>
                <p className="text-[11px] text-[var(--color-muted)] uppercase">Overall</p>
                <p className="text-3xl font-semibold text-[var(--color-navy)]">{current.overall_score}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--color-muted)] uppercase">Confidence</p>
                <p
                  className={`text-lg font-medium ${
                    current.score_confidence === "high"
                      ? "text-emerald-400"
                      : current.score_confidence === "medium"
                        ? "text-amber-300"
                        : "text-[var(--color-muted)]"
                  }`}
                >
                  {current.score_confidence}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--color-muted)] uppercase">Computed</p>
                <p className="text-sm text-[var(--color-slate)]">
                  {new Date(current.computed_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--color-muted)] uppercase">Model</p>
                <p className="text-sm text-[var(--color-slate)]">{current.score_version}</p>
              </div>
            </div>

            {current.flags.length > 0 && (
              <div>
                <p className="text-[11px] text-[var(--color-muted)] uppercase mb-1">Flags</p>
                <ul className="flex flex-wrap gap-2">
                  {current.flags.map((f) => (
                    <li
                      key={f}
                      className="text-xs rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-slate)]"
                    >
                      {f.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-[11px] text-[var(--color-muted)] uppercase mb-2">Input summary</p>
              <pre className="text-[11px] bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-lg p-3 overflow-x-auto text-[var(--color-muted)]">
                {JSON.stringify(current.inputs_summary, null, 2)}
              </pre>
            </div>

            <div>
              <p className="text-[11px] text-[var(--color-muted)] uppercase mb-2">Category breakdown</p>
              <div className="space-y-4">
                {cats.map(([key, c]) => (
                  <div
                    key={key}
                    className="border border-[var(--color-border-light)] rounded-lg p-3 bg-[var(--color-warm-cream)]/70"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium text-[var(--color-charcoal)]">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm text-[var(--color-muted)]">
                        score {c.score} · weight {c.weight} · weighted {c.weighted_score} ·{" "}
                        <span className="text-violet-300">{c.confidence}</span>
                      </span>
                    </div>
                    {c.reasons?.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-xs text-[var(--color-muted)]">
                        {c.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {signals && (
          <section
            id="org-signals-snapshot"
            className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-5 space-y-4 scroll-mt-24"
          >
            <h2 className="text-sm font-semibold text-[var(--color-charcoal)]">Org signal snapshot (internal)</h2>
            <p className="text-xs text-[var(--color-muted)]">
              Lightweight derived operational signals for internal scoring/debug use. Not public and
              not shown to victims.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/70 p-3">
                <p className="text-[var(--color-muted)] uppercase">Profile</p>
                <p className="text-[var(--color-slate)] mt-1">
                  {signals.profile.profileStatus ?? "—"} · {signals.profile.profileStage ?? "—"}
                </p>
                <p className="text-[var(--color-muted)]">Completeness: {signals.profile.completeness ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/70 p-3">
                <p className="text-[var(--color-muted)] uppercase">Cases</p>
                <p className="text-[var(--color-slate)] mt-1">
                  total {signals.cases.total} · active {signals.cases.active} · stale {signals.cases.stale}
                </p>
                <p className="text-[var(--color-muted)]">
                  avg age {signals.cases.avgAgeDays != null ? `${signals.cases.avgAgeDays.toFixed(1)}d` : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/70 p-3">
                <p className="text-[var(--color-muted)] uppercase">Messaging</p>
                <p className="text-[var(--color-slate)] mt-1">
                  threads {signals.messaging.recentMessageThreads} · confidence{" "}
                  {signals.messaging.replySignalConfidence}
                </p>
                <p className="text-[var(--color-muted)]">
                  avg first reply{" "}
                  {signals.messaging.avgFirstReplyHours != null
                    ? `${signals.messaging.avgFirstReplyHours.toFixed(1)}h`
                    : "—"}
                </p>
              </div>
            </div>

            {signals.flags.length > 0 && (
              <div>
                <p className="text-[11px] text-[var(--color-muted)] uppercase mb-1">Signal flags</p>
                <ul className="flex flex-wrap gap-2">
                  {signals.flags.map((f) => (
                    <li
                      key={f}
                      className="text-xs rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-slate)]"
                    >
                      {f.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <pre className="text-[11px] bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-lg p-3 overflow-x-auto text-[var(--color-muted)]">
              {JSON.stringify(signals, null, 2)}
            </pre>
          </section>
        )}

        {!current && !loading && orgId && (
          <p className="text-sm text-[var(--color-muted)]">
            No score on file for this organization. Use &quot;Load / compute if missing&quot; to
            generate one.
          </p>
        )}

        {history.filter((h) => h.id !== current?.id).length > 0 && (
          <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-5">
            <h2 className="text-sm font-semibold text-[var(--color-charcoal)] mb-3">Recent runs</h2>
            <ul className="text-xs space-y-2">
              {history
                .filter((h) => h.id !== current?.id)
                .slice(0, 10)
                .map((h) => (
                <li key={h.id} className="flex justify-between border-b border-[var(--color-border-light)] py-2">
                  <span className="text-[var(--color-muted)]">
                    {new Date(h.computed_at).toLocaleString()} · {h.status}
                  </span>
                  <span>
                    {h.overall_score} · {h.score_confidence}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
