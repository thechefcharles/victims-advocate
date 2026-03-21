"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { PageHeader } from "@/components/layout/PageHeader";

type KnowledgeEntry = {
  id: string;
  created_at: string;
  updated_at: string;
  entry_key: string;
  title: string;
  body: string;
  category: string;
  state_code: string | null;
  program_key: string | null;
  version: string;
  status: string;
  is_active: boolean;
  source_label: string | null;
};

const CATEGORIES = [
  "eligibility",
  "documents",
  "timeline",
  "rights",
  "definitions",
  "faq",
  "program_overview",
] as const;

export default function AdminKnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterState, setFilterState] = useState("");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    entry_key: "",
    title: "",
    body: "",
    category: "program_overview",
    state_code: "",
    program_key: "",
    version: "1",
  });

  const load = async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.href = "/login";
      setLoading(false);
      return;
    }
    const params = new URLSearchParams();
    if (filterCategory) params.set("category", filterCategory);
    if (filterStatus) params.set("status", filterStatus);
    if (filterState) params.set("stateCode", filterState);
    if (query.trim()) params.set("query", query.trim());
    const res = await fetch(`/api/admin/knowledge?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setErr("Failed to load knowledge entries");
      setEntries([]);
      setLoading(false);
      return;
    }
    const json = await res.json();
    setEntries(json.data?.entries ?? []);
    setErr(null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filterCategory, filterStatus, filterState, query]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.entry_key.trim() || !form.title.trim() || !form.body.trim()) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          entry_key: form.entry_key.trim(),
          title: form.title.trim(),
          body: form.body,
          category: form.category,
          version: form.version.trim() || "1",
          state_code: form.state_code.trim() || null,
          program_key: form.program_key.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json?.error?.message ?? "Create failed");
        return;
      }
      setErr(null);
      setForm({ entry_key: "", title: "", body: "", category: "program_overview", state_code: "", program_key: "", version: "1" });
      await load();
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const entry = entries.find((x) => x.id === editingId);
    if (!entry) return;
    try {
      const res = await fetch("/api/admin/knowledge/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: editingId,
          title: form.title.trim(),
          body: form.body,
          category: form.category,
          state_code: form.state_code.trim() || null,
          program_key: form.program_key.trim() || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setErr(json?.error?.message ?? "Update failed");
        return;
      }
      setErr(null);
      setEditingId(null);
      await load();
    } catch {
      setErr("Update failed");
    }
  };

  const handleActivate = async (id: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/admin/knowledge/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setErr("Activate failed");
      return;
    }
    setErr(null);
    await load();
  };

  const handleArchive = async (id: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/admin/knowledge/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setErr("Archive failed");
      return;
    }
    setErr(null);
    setEditingId(null);
    await load();
  };

  const startEdit = (entry: KnowledgeEntry) => {
    if (entry.status !== "draft") return;
    setEditingId(entry.id);
    setForm({
      entry_key: entry.entry_key,
      title: entry.title,
      body: entry.body,
      category: entry.category,
      state_code: entry.state_code ?? "",
      program_key: entry.program_key ?? "",
      version: entry.version,
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          contextLine="Admin → Knowledge base"
          eyebrow="Admin · Knowledge"
          title="Knowledge base"
          subtitle="Help articles and eligibility text shown to advocates and survivors. Draft first, then activate."
          rightActions={
            <Link href="/admin/cases" className="text-sm text-slate-400 hover:text-slate-200">
              Cases
            </Link>
          }
        />

        {err && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-200">
            {err}
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Search title/body"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200 w-48 min-w-[10rem]"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
            >
              <option value="">All states</option>
              <option value="IL">IL</option>
              <option value="IN">IN</option>
            </select>
          </div>
          {!editingId && (
            <a
              href="#admin-knowledge-create"
              className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 shrink-0"
            >
              Create
            </a>
          )}
        </div>

        {!editingId ? (
          <section
            id="admin-knowledge-create"
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 scroll-mt-24"
          >
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Create</h2>
            <form onSubmit={handleCreate} className="space-y-2 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  required
                  placeholder="entry_key (e.g. il.vc.eligibility.overview)"
                  value={form.entry_key}
                  onChange={(e) => setForm((f) => ({ ...f, entry_key: e.target.value }))}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 w-full"
                />
                <input
                  required
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 w-full"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  placeholder="State (IL, IN)"
                  value={form.state_code}
                  onChange={(e) => setForm((f) => ({ ...f, state_code: e.target.value }))}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 w-20"
                />
                <input
                  placeholder="Program key"
                  value={form.program_key}
                  onChange={(e) => setForm((f) => ({ ...f, program_key: e.target.value }))}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 w-40"
                />
              </div>
              <textarea
                required
                placeholder="Body (plain text)"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={4}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
              />
              <button
                type="submit"
                disabled={creating}
                className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </form>
          </section>
        ) : (
          <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Edit</h2>
            <form onSubmit={handleUpdate} className="space-y-2 text-sm">
              <input
                required
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
              />
              <textarea
                required
                placeholder="Body"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={6}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-200">All entries ({entries.length})</h2>
          {loading ? (
            <p className="text-sm text-slate-400 py-4">Loading…</p>
          ) : entries.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">
              <p className="font-medium text-slate-300">No items found.</p>
              <p className="mt-2 text-xs text-slate-500">
                Clear filters or create a draft entry to add help content.
              </p>
            </div>
          ) : (
          <ul className="divide-y divide-slate-800">
            {entries.map((entry) => (
              <li key={entry.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-slate-400">{entry.entry_key}</p>
                  <p className="font-medium text-slate-100 truncate">{entry.title}</p>
                  <p className="text-xs text-slate-500">
                    {entry.category} · {entry.state_code ?? "—"} · {entry.program_key ?? "—"} · {entry.status}
                    {entry.is_active && " · active"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {entry.status === "draft" && (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(entry)}
                        className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActivate(entry.id)}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500"
                      >
                        Activate
                      </button>
                    </>
                  )}
                  {entry.status === "active" && (
                    <button
                      type="button"
                      onClick={() => handleArchive(entry.id)}
                      className="rounded border border-amber-600 px-2 py-1 text-xs text-amber-200 hover:bg-amber-900/30"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          )}
        </section>
      </div>
    </main>
  );
}
