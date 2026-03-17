"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { ORG_DESIGNATION_VERSION } from "@/lib/designations/version";

type Org = { id: string; name: string };

type DesignationRow = {
  id: string;
  created_at: string;
  designation_tier: string;
  designation_confidence: string;
  public_summary: string | null;
  flags: string[];
  grading_run_id: string | null;
  designation_version: string;
  is_current: boolean;
};

export default function AdminDesignationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<DesignationRow | null>(null);
  const [history, setHistory] = useState<DesignationRow[]>([]);

  const loadOrgs = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const res = await fetch("/api/admin/orgs", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setErr(getApiErrorMessage(json, "Failed to load orgs"));
      return;
    }
    const json = await res.json();
    const list = (json.data?.orgs ?? []) as Org[];
    setOrgs(list);
    if (list.length && !orgId) setOrgId(list[0].id);
  };

  const loadDesignation = async (id: string) => {
    if (!id) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch(`/api/admin/designations/org/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setCurrent(null);
      setHistory([]);
      return;
    }
    const json = await res.json();
    const d = json.data ?? json;
    setCurrent((d.current as DesignationRow) ?? null);
    setHistory((d.history as DesignationRow[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadOrgs();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (orgId) loadDesignation(orgId);
  }, [orgId]);

  const runDesignation = async (force: boolean) => {
    if (!orgId) return;
    setRunning(true);
    setErr(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/admin/designations/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ organization_id: orgId, force_recompute: force }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Designation run failed"));
        return;
      }
      await loadDesignation(orgId);
    } finally {
      setRunning(false);
    }
  };

  const hist = history.filter((h) => h.id !== current?.id);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-slate-400">Admin · Internal</p>
            <h1 className="text-2xl font-bold">Organization designations</h1>
            <p className="text-sm text-slate-400 mt-1">
              Mapping version <code className="text-teal-300">{ORG_DESIGNATION_VERSION}</code> — tiers
              only; raw grading scores stay internal.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/admin/grading" className="text-slate-400 hover:text-slate-200">
              Grading
            </Link>
            <Link href="/admin/orgs" className="text-slate-400 hover:text-slate-200">
              Orgs
            </Link>
            <Link href="/admin/designation-reviews" className="text-amber-400 hover:text-amber-200">
              Review requests
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
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm min-w-[240px]"
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
                onClick={() => runDesignation(false)}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
              >
                {running ? "…" : "Load / compute if missing"}
              </button>
              <button
                type="button"
                disabled={running || !orgId}
                onClick={() => runDesignation(true)}
                className="rounded-lg border border-teal-500/50 px-4 py-2 text-sm text-teal-200 hover:bg-teal-500/10 disabled:opacity-50"
              >
                Force recompute
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500">
            Run internal grading first (Phase C). Designation reads the latest current grading row.
          </p>
        </section>

        {current && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200">Current designation</h2>
            <div className="flex flex-wrap gap-4 items-baseline">
              <div>
                <p className="text-[11px] text-slate-500 uppercase">Tier</p>
                <p className="text-2xl font-semibold text-teal-300 capitalize">
                  {current.designation_tier.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase">Confidence</p>
                <p className="text-lg text-slate-200">{current.designation_confidence}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase">Grading link</p>
                <p className="text-xs font-mono text-slate-400">
                  {current.grading_run_id ?? "—"}
                </p>
              </div>
            </div>
            {current.public_summary && (
              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300 leading-relaxed">
                {current.public_summary}
              </div>
            )}
            {current.flags.length > 0 && (
              <div>
                <p className="text-[11px] text-slate-500 uppercase mb-1">Flags</p>
                <ul className="flex flex-wrap gap-2">
                  {current.flags.map((f) => (
                    <li
                      key={f}
                      className="text-xs rounded-full border border-slate-600 px-2 py-0.5 text-slate-400"
                    >
                      {f.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {!current && !loading && orgId && (
          <p className="text-sm text-slate-400">
            No designation yet. Ensure grading exists, then run designation.
          </p>
        )}

        {hist.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">History</h2>
            <ul className="text-xs space-y-2">
              {hist.slice(0, 10).map((h) => (
                <li key={h.id} className="flex justify-between border-b border-slate-800 py-2">
                  <span className="text-slate-400">
                    {new Date(h.created_at).toLocaleString()} · {h.designation_tier}
                  </span>
                  <span>{h.designation_confidence}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
