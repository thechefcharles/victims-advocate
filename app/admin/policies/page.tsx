"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type PolicyRow = {
  id: string;
  created_at: string;
  updated_at: string;
  doc_type: string;
  version: string;
  title: string;
  is_active: boolean;
  applies_to_role: string | null;
  workflow_key: string | null;
  created_by: string | null;
};

const DOC_TYPES = ["terms_of_use", "privacy_policy", "ai_disclaimer", "non_legal_advice"] as const;

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    doc_type: "terms_of_use",
    version: "",
    title: "",
    content: "",
    applies_to_role: "",
    workflow_key: "",
  });

  const load = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const res = await fetch("/api/admin/policies", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setErr(getApiErrorMessage(json, "Failed to load policies"));
      setPolicies([]);
      return;
    }
    const json = await res.json();
    setPolicies(json.data?.policies ?? []);
    setErr(null);
  };

  useEffect(() => {
    load();
  }, []);

  const handleActivate = async (policyId: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/admin/policies/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ policy_id: policyId }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setErr(getApiErrorMessage(json, "Failed to activate"));
      return;
    }
    setErr(null);
    await load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.version.trim() || !form.title.trim()) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          doc_type: form.doc_type,
          version: form.version.trim(),
          title: form.title.trim(),
          content: form.content,
          applies_to_role: form.applies_to_role.trim() || null,
          workflow_key: form.workflow_key.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Failed to create"));
        return;
      }
      setErr(null);
      setForm((f) => ({ ...f, version: "", title: "", content: "" }));
      await load();
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-slate-400">
              Admin · Policies
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold">Policy documents</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/cases" className="text-sm text-slate-400 hover:text-slate-200">
              ← Cases
            </Link>
            <Link href="/admin/orgs" className="text-sm text-slate-400 hover:text-slate-200">
              Orgs
            </Link>
            <Link href="/admin/audit" className="text-sm text-slate-400 hover:text-slate-200">
              Audit
            </Link>
          </div>
        </header>

        {err && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Create new version</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <select
                value={form.doc_type}
                onChange={(e) => setForm((f) => ({ ...f, doc_type: e.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Version (e.g. 2025-01)"
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 w-32"
              />
              <input
                type="text"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 flex-1 min-w-[200px]"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Applies to role (victim/advocate/admin or leave empty)"
                value={form.applies_to_role}
                onChange={(e) => setForm((f) => ({ ...f, applies_to_role: e.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 w-56"
              />
              <input
                type="text"
                placeholder="Workflow key (e.g. compensation_intake)"
                value={form.workflow_key}
                onChange={(e) => setForm((f) => ({ ...f, workflow_key: e.target.value }))}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 w-56"
              />
            </div>
            <textarea
              placeholder="Content (plain text)"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={6}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            />
            <button
              type="submit"
              disabled={creating || !form.version.trim() || !form.title.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create (inactive)"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">All policy versions</h2>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : policies.length === 0 ? (
            <p className="text-sm text-slate-400">No policy documents yet.</p>
          ) : (
            <ul className="space-y-2">
              {policies.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
                >
                  <div>
                    <span className="font-medium text-slate-100">{p.title}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {p.doc_type} · v{p.version}
                      {p.applies_to_role ? ` · ${p.applies_to_role}` : ""}
                      {p.workflow_key ? ` · ${p.workflow_key}` : ""}
                    </span>
                    {p.is_active && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                        Active
                      </span>
                    )}
                  </div>
                  {!p.is_active && (
                    <button
                      type="button"
                      onClick={() => handleActivate(p.id)}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Activate
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
