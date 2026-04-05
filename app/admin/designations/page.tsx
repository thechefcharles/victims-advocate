"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { ORG_DESIGNATION_VERSION } from "@/lib/designations/version";
import {
  EMPTY_COPY,
  TRUST_LINK_HREF,
  TRUST_LINK_LABELS,
  TRUST_MICROCOPY,
  designationTierBadgeText,
} from "@/lib/trustDisplay";

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

type DesignationPresentation = {
  confidence_note: string;
  hints: string[];
  signal_flags: string[];
  internal_explanation: { headline: string; bullets: string[] };
};

export default function AdminDesignationsPage() {
  const searchParams = useSearchParams();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<DesignationRow | null>(null);
  const [history, setHistory] = useState<DesignationRow[]>([]);
  const [presentation, setPresentation] = useState<DesignationPresentation | null>(null);

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
    setPresentation((d.presentation as DesignationPresentation | null) ?? null);
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
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-[var(--color-muted)]">Admin · Internal</p>
            <h1 className="text-2xl font-bold">Organization designations</h1>
            <p className="text-sm text-[var(--color-muted)] mt-1 max-w-2xl leading-relaxed">
              {TRUST_MICROCOPY.designationNotRating} Mapping version{" "}
              <code className="text-teal-300">{ORG_DESIGNATION_VERSION}</code> — plain-language tiers
              only; raw grading scores stay internal.
            </p>
            <p className="text-xs text-[var(--color-muted)] mt-2">
              <Link href={TRUST_LINK_HREF.designations} className="text-teal-400/90 hover:underline">
                {TRUST_LINK_LABELS.aboutDesignations}
              </Link>
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/admin/grading" className="text-[var(--color-muted)] hover:text-[var(--color-charcoal)]">
              Review grading
            </Link>
            <Link href="/admin/orgs" className="text-[var(--color-muted)] hover:text-[var(--color-charcoal)]">
              Organizations
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

        <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--color-charcoal)]">Organization</h2>
          {loading ? (
            <p className="text-sm text-[var(--color-muted)]">Loading…</p>
          ) : (
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm min-w-[240px]"
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
                className="rounded-lg bg-[var(--color-teal-deep)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
              >
                {running ? "…" : "Load / compute if missing"}
              </button>
              <button
                type="button"
                disabled={running || !orgId}
                onClick={() => runDesignation(true)}
                className="rounded-lg bg-[var(--color-teal-deep)] px-4 py-2 text-sm text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
              >
                Force recompute
              </button>
            </div>
          )}
          <p className="text-xs text-[var(--color-muted)]">
            Run internal grading first (Phase C). Designation reads the latest current grading row.
          </p>
        </section>

        {current && (
          <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-charcoal)]">Current designation</h2>
            <div className="flex flex-wrap gap-4 items-baseline">
              <div>
                <p className="text-[11px] text-[var(--color-muted)] uppercase">Tier</p>
                <p className="text-2xl font-semibold text-teal-200 mt-1">
                  {designationTierBadgeText(current.designation_tier) ??
                    current.designation_tier.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--color-muted)] uppercase">Confidence</p>
                <p className="text-sm text-[var(--color-muted)] mt-1">{current.designation_confidence}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--color-muted)] uppercase">Grading link</p>
                <p className="text-xs font-mono text-[var(--color-muted)]">
                  {current.grading_run_id ?? "—"}
                </p>
              </div>
            </div>
            {current.public_summary && (
              <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/75 p-4 text-sm text-[var(--color-slate)] leading-relaxed">
                {current.public_summary}
              </div>
            )}
            {current.flags.length > 0 && (
              <div>
                <p className="text-[11px] text-[var(--color-muted)] uppercase mb-1">Flags</p>
                <ul className="flex flex-wrap gap-2">
                  {current.flags.map((f) => (
                    <li
                      key={f}
                      className="text-xs rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-muted)]"
                    >
                      {f.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {presentation?.confidence_note && (
              <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/75 p-3 text-xs text-[var(--color-slate)]">
                {presentation.confidence_note}
              </div>
            )}
            {presentation?.internal_explanation && (
              <div className="text-xs text-[var(--color-muted)] border-t border-[var(--color-border-light)] pt-3">
                <p className="font-medium text-[var(--color-slate)]">{presentation.internal_explanation.headline}</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {presentation.internal_explanation.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
            {presentation?.hints?.length ? (
              <div>
                <p className="text-[11px] text-[var(--color-muted)] uppercase mb-1">Reliability improvement hints</p>
                <ul className="list-disc list-inside text-xs text-[var(--color-muted)] space-y-0.5">
                  {presentation.hints.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        )}

        {!current && !loading && orgId && (
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            {EMPTY_COPY.noDesignationYet} Ensure grading exists, then run designation.
          </p>
        )}

        {hist.length > 0 && (
          <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-5">
            <h2 className="text-sm font-semibold text-[var(--color-charcoal)] mb-3">History</h2>
            <ul className="text-xs space-y-2">
              {hist.slice(0, 10).map((h) => (
                <li key={h.id} className="flex flex-wrap justify-between gap-2 border-b border-[var(--color-border-light)] py-2">
                  <span className="text-[var(--color-muted)]">
                    {new Date(h.created_at).toLocaleString()} ·{" "}
                    {designationTierBadgeText(h.designation_tier) ?? h.designation_tier.replace(/_/g, " ")}
                  </span>
                  <span className="text-[var(--color-muted)] text-[11px]">{h.designation_confidence}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
