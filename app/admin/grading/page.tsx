"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { ORG_GRADING_VERSION } from "@/lib/grading/version";

type Org = { id: string; name: string; type: string; status: string };

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
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [current, setCurrent] = useState<ScoreRow | null>(null);
  const [history, setHistory] = useState<ScoreRow[]>([]);

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
      setErr(getApiErrorMessage(json, "Failed to load orgs"));
      return;
    }
    const json = await res.json();
    const list = (json.data?.orgs ?? []) as Org[];
    setOrgs(list);
    if (list.length && !orgId) setOrgId(list[0].id);
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

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadOrgs();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (orgId) loadScore(orgId);
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
        setErr(getApiErrorMessage(json, "Grading failed"));
        return;
      }
      await loadScore(orgId);
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
        setErr(getApiErrorMessage(json, "Batch grading failed"));
        return;
      }
      if (orgId) await loadScore(orgId);
    } finally {
      setBatchRunning(false);
    }
  };

  const cats = current?.category_scores
    ? Object.entries(current.category_scores)
    : [];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-slate-400">
              Admin · Internal only
            </p>
            <h1 className="text-2xl font-bold">CBO quality grading</h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Internal scoring supports designation mapping — scores are not shown to survivors or the
              public. Version <code className="text-violet-300">{ORG_GRADING_VERSION}</code> — not
              public, not used in matching.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm items-center">
            <Link href="/admin/orgs" className="text-slate-400 hover:text-slate-200">
              ← Orgs
            </Link>
            <Link href="/admin/cases" className="text-slate-400 hover:text-slate-200">
              Cases
            </Link>
            <Link href="/admin/designations" className="text-teal-400 hover:text-teal-200">
              Designations
            </Link>
          </div>
        </header>

        {err && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Organization</h2>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 min-w-[240px]"
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
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {running ? "…" : "Load / compute if missing"}
              </button>
              <button
                type="button"
                disabled={running || !orgId}
                onClick={() => runGrading(true)}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50"
              >
                Force recompute
              </button>
              <button
                type="button"
                disabled={batchRunning}
                onClick={runAll}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                {batchRunning ? "Batch…" : "Run all (cap 30)"}
              </button>
            </div>
          )}
        </section>

        {current && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200">Latest score</h2>
            <div className="flex flex-wrap gap-6 items-baseline">
              <div>
                <p className="text-[11px] text-slate-500 uppercase">Overall</p>
                <p className="text-3xl font-semibold text-slate-100">{current.overall_score}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase">Confidence</p>
                <p
                  className={`text-lg font-medium ${
                    current.score_confidence === "high"
                      ? "text-emerald-400"
                      : current.score_confidence === "medium"
                        ? "text-amber-300"
                        : "text-slate-400"
                  }`}
                >
                  {current.score_confidence}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase">Computed</p>
                <p className="text-sm text-slate-300">
                  {new Date(current.computed_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase">Model</p>
                <p className="text-sm text-slate-300">{current.score_version}</p>
              </div>
            </div>

            {current.flags.length > 0 && (
              <div>
                <p className="text-[11px] text-slate-500 uppercase mb-1">Flags</p>
                <ul className="flex flex-wrap gap-2">
                  {current.flags.map((f) => (
                    <li
                      key={f}
                      className="text-xs rounded-full border border-slate-600 px-2 py-0.5 text-slate-300"
                    >
                      {f.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-[11px] text-slate-500 uppercase mb-2">Input summary</p>
              <pre className="text-[11px] bg-slate-950/80 border border-slate-800 rounded-lg p-3 overflow-x-auto text-slate-400">
                {JSON.stringify(current.inputs_summary, null, 2)}
              </pre>
            </div>

            <div>
              <p className="text-[11px] text-slate-500 uppercase mb-2">Category breakdown</p>
              <div className="space-y-4">
                {cats.map(([key, c]) => (
                  <div
                    key={key}
                    className="border border-slate-800 rounded-lg p-3 bg-slate-950/40"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium text-slate-200">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm text-slate-400">
                        score {c.score} · weight {c.weight} · weighted {c.weighted_score} ·{" "}
                        <span className="text-violet-300">{c.confidence}</span>
                      </span>
                    </div>
                    {c.reasons?.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-xs text-slate-400">
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

        {!current && !loading && orgId && (
          <p className="text-sm text-slate-400">
            No score on file for this organization. Use &quot;Load / compute if missing&quot; to
            generate one.
          </p>
        )}

        {history.filter((h) => h.id !== current?.id).length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Recent runs</h2>
            <ul className="text-xs space-y-2">
              {history
                .filter((h) => h.id !== current?.id)
                .slice(0, 10)
                .map((h) => (
                <li key={h.id} className="flex justify-between border-b border-slate-800 py-2">
                  <span className="text-slate-400">
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
