"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
import { getDashboardPath } from "@/lib/dashboardRoutes";

type KnowledgeEntry = {
  id: string;
  entry_key: string;
  title: string;
  body: string;
  category: string;
  state_code: string | null;
  program_key: string | null;
  source_label: string | null;
  last_reviewed_at: string | null;
};

export default function KnowledgePage() {
  const { isAdmin, orgId, orgRole, role } = useAuth();
  const { t } = useI18n();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [stateCode, setStateCode] = useState("");

  const load = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setEntries([]);
      setLoading(false);
      return;
    }
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (category) params.set("category", category);
    if (stateCode) params.set("stateCode", stateCode);
    const res = await fetch(`/api/knowledge/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setEntries([]);
      setLoading(false);
      return;
    }
    const json = await res.json();
    setEntries(json.data?.entries ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [query, category, stateCode]);

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US");
  };

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-xs tracking-[0.25em] uppercase text-[var(--color-muted)]">Knowledge base</p>
          <h1 className="text-2xl font-bold text-[var(--color-navy)]">Program & eligibility information</h1>
          <p className="text-sm text-[var(--color-slate)]">
            Plain-language overviews for compensation programs. This is general information, not legal advice.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm text-[var(--color-charcoal)] w-48"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm text-[var(--color-charcoal)]"
          >
            <option value="">All categories</option>
            <option value="program_overview">Program overview</option>
            <option value="eligibility">Eligibility</option>
            <option value="documents">Documents</option>
            <option value="timeline">Timeline</option>
            <option value="definitions">Definitions</option>
            <option value="rights">Rights</option>
            <option value="faq">FAQ</option>
          </select>
          <select
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
            className="rounded border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm text-[var(--color-charcoal)]"
          >
            <option value="">All states</option>
            <option value="IL">Illinois</option>
            <option value="IN">Indiana</option>
          </select>
        </div>

        {loading ? (
          <p className="text-[var(--color-muted)]">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-[var(--color-muted)]">No entries found.</p>
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/90 p-4 space-y-2"
              >
                <p className="text-xs text-[var(--color-muted)]">
                  {entry.category} {entry.state_code ? ` · ${entry.state_code}` : ""} {entry.program_key ? ` · ${entry.program_key}` : ""}
                </p>
                <h2 className="text-lg font-semibold text-[var(--color-navy)]">{entry.title}</h2>
                <p className="text-sm text-[var(--color-slate)] whitespace-pre-wrap">{entry.body}</p>
                {(entry.source_label || entry.last_reviewed_at) && (
                  <p className="text-[11px] text-[var(--color-muted)]">
                    {entry.source_label ?? ""}
                    {entry.source_label && entry.last_reviewed_at && " · "}
                    {entry.last_reviewed_at && `Last reviewed: ${formatDate(entry.last_reviewed_at) ?? entry.last_reviewed_at}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-[var(--color-muted)]">
          <Link href="/knowledge/compensation" className="text-emerald-400 hover:text-emerald-300">
            Illinois compensation guide
          </Link>
          {" · "}
          <Link
            href={getDashboardPath({ isAdmin, orgId, orgRole, role })}
            className="text-emerald-400 hover:text-emerald-300"
          >
            {t("common.backToWorkspaceInline")}
          </Link>
        </p>
      </div>
    </main>
  );
}
