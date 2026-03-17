"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-xs tracking-[0.25em] uppercase text-slate-400">Knowledge base</p>
          <h1 className="text-2xl font-bold text-slate-100">Program & eligibility information</h1>
          <p className="text-sm text-slate-300">
            Plain-language overviews for compensation programs. This is general information, not legal advice.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 w-48"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200"
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
            className="rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200"
          >
            <option value="">All states</option>
            <option value="IL">Illinois</option>
            <option value="IN">Indiana</option>
          </select>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-slate-400">No entries found.</p>
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2"
              >
                <p className="text-xs text-slate-500">
                  {entry.category} {entry.state_code ? ` · ${entry.state_code}` : ""} {entry.program_key ? ` · ${entry.program_key}` : ""}
                </p>
                <h2 className="text-lg font-semibold text-slate-100">{entry.title}</h2>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{entry.body}</p>
                {(entry.source_label || entry.last_reviewed_at) && (
                  <p className="text-[11px] text-slate-500">
                    {entry.source_label ?? ""}
                    {entry.source_label && entry.last_reviewed_at && " · "}
                    {entry.last_reviewed_at && `Last reviewed: ${formatDate(entry.last_reviewed_at) ?? entry.last_reviewed_at}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-slate-500">
          <Link href="/knowledge/compensation" className="text-emerald-400 hover:text-emerald-300">
            Illinois compensation guide
          </Link>
          {" · "}
          <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300">
            Dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}
