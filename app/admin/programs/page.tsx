"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type ProgramDefinition = {
  id: string;
  created_at: string;
  updated_at: string;
  program_key: string;
  name: string;
  description: string | null;
  state_code: string | null;
  scope_type: string;
  status: string;
  is_active: boolean;
  version: string;
  rule_set: Record<string, unknown>;
  required_documents: unknown[];
  deadline_metadata: Record<string, unknown>;
  dependency_rules: Record<string, unknown>;
  stacking_rules: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<ProgramDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterState, setFilterState] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    program_key: "",
    name: "",
    description: "",
    state_code: "",
    scope_type: "state",
    version: "1",
    rule_set_json: "{}",
    required_documents_json: "[]",
    deadline_metadata_json: "{}",
    dependency_rules_json: "{}",
    stacking_rules_json: "{}",
    metadata_json: "{}",
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
    if (filterStatus) params.set("status", filterStatus);
    if (filterState) params.set("stateCode", filterState);
    const res = await fetch(`/api/admin/programs?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setErr("Failed to load programs");
      setPrograms([]);
      setLoading(false);
      return;
    }
    const json = await res.json();
    setPrograms(json.data?.programs ?? []);
    setErr(null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filterStatus, filterState]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.program_key.trim() || !form.name.trim()) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setCreating(true);
    try {
      let rule_set = {};
      let required_documents: unknown[] = [];
      let deadline_metadata = {};
      let dependency_rules = {};
      let stacking_rules = {};
      let metadata = {};
      try {
        rule_set = JSON.parse(form.rule_set_json || "{}");
        required_documents = JSON.parse(form.required_documents_json || "[]");
        deadline_metadata = JSON.parse(form.deadline_metadata_json || "{}");
        dependency_rules = JSON.parse(form.dependency_rules_json || "{}");
        stacking_rules = JSON.parse(form.stacking_rules_json || "{}");
        metadata = JSON.parse(form.metadata_json || "{}");
      } catch {
        setErr("Invalid JSON in one of the fields");
        return;
      }
      const res = await fetch("/api/admin/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          program_key: form.program_key.trim(),
          name: form.name.trim(),
          description: form.description.trim() || null,
          state_code: form.state_code.trim() || null,
          scope_type: form.scope_type,
          version: form.version.trim() || "1",
          rule_set,
          required_documents,
          deadline_metadata,
          dependency_rules,
          stacking_rules,
          metadata,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json?.error?.message ?? "Create failed");
        return;
      }
      setErr(null);
      setForm({
        program_key: "",
        name: "",
        description: "",
        state_code: "",
        scope_type: "state",
        version: "1",
        rule_set_json: "{}",
        required_documents_json: "[]",
        deadline_metadata_json: "{}",
        dependency_rules_json: "{}",
        stacking_rules_json: "{}",
        metadata_json: "{}",
      });
      await load();
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (p: ProgramDefinition) => {
    setEditingId(p.id);
    setForm({
      program_key: p.program_key,
      name: p.name,
      description: p.description ?? "",
      state_code: p.state_code ?? "",
      scope_type: p.scope_type,
      version: p.version,
      rule_set_json: JSON.stringify(p.rule_set ?? {}, null, 2),
      required_documents_json: JSON.stringify(p.required_documents ?? [], null, 2),
      deadline_metadata_json: JSON.stringify(p.deadline_metadata ?? {}, null, 2),
      dependency_rules_json: JSON.stringify(p.dependency_rules ?? {}, null, 2),
      stacking_rules_json: JSON.stringify(p.stacking_rules ?? {}, null, 2),
      metadata_json: JSON.stringify(p.metadata ?? {}, null, 2),
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    try {
      const rule_set = JSON.parse(form.rule_set_json || "{}");
      const required_documents = JSON.parse(form.required_documents_json || "[]");
      const deadline_metadata = JSON.parse(form.deadline_metadata_json || "{}");
      const dependency_rules = JSON.parse(form.dependency_rules_json || "{}");
      const stacking_rules = JSON.parse(form.stacking_rules_json || "{}");
      const metadata = JSON.parse(form.metadata_json || "{}");
      const res = await fetch("/api/admin/programs/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: editingId,
          name: form.name.trim(),
          description: form.description.trim() || null,
          state_code: form.state_code.trim() || null,
          program_key: form.program_key.trim(),
          scope_type: form.scope_type,
          version: form.version.trim(),
          rule_set,
          required_documents,
          deadline_metadata,
          dependency_rules,
          stacking_rules,
          metadata,
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
      setErr("Invalid JSON or update failed");
    }
  };

  const handleActivate = async (id: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/admin/programs/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    if (res.ok) await load();
    else {
      const json = await res.json().catch(() => null);
      setErr(json?.error?.message ?? "Activate failed");
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Archive this program? It will no longer be used for routing.")) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/admin/programs/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    if (res.ok) await load();
    else {
      const json = await res.json().catch(() => null);
      setErr(json?.error?.message ?? "Archive failed");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-xs tracking-[0.25em] uppercase text-slate-400">Admin · Routing</p>
          <h1 className="text-2xl font-bold text-slate-100">Program definitions</h1>
          <p className="text-sm text-slate-300">
            Define routable programs and rule sets for intake-to-program matching. Only active programs are used when running routing on a case.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/cases"
              className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
            >
              ← Cases
            </Link>
            <Link
              href="/admin/knowledge"
              className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
            >
              Knowledge
            </Link>
          </div>
        </header>

        {err && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
            {err}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center text-sm">
          <label className="flex items-center gap-2">
            <span className="text-slate-400">Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200"
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-slate-400">State</span>
            <input
              type="text"
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              placeholder="e.g. IL"
              className="w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200"
            />
          </label>
        </div>

        {/* Create form */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-50">Create draft program</h2>
          <form onSubmit={handleCreate} className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={form.program_key}
              onChange={(e) => setForm((f) => ({ ...f, program_key: e.target.value }))}
              placeholder="program_key (e.g. illinois_vc)"
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 sm:col-span-2"
              required
            />
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Name"
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
              required
            />
            <input
              type="text"
              value={form.state_code}
              onChange={(e) => setForm((f) => ({ ...f, state_code: e.target.value }))}
              placeholder="State code (e.g. IL)"
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
            />
            <select
              value={form.scope_type}
              onChange={(e) => setForm((f) => ({ ...f, scope_type: e.target.value }))}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
            >
              <option value="state">state</option>
              <option value="federal">federal</option>
              <option value="local">local</option>
              <option value="general">general</option>
            </select>
            <input
              type="text"
              value={form.version}
              onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              placeholder="Version"
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description"
              rows={2}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 sm:col-span-2"
            />
            <div className="sm:col-span-2">
              <label className="block text-slate-400 text-xs mb-1">rule_set (JSON)</label>
              <textarea
                value={form.rule_set_json}
                onChange={(e) => setForm((f) => ({ ...f, rule_set_json: e.target.value }))}
                rows={4}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 font-mono text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 text-xs mb-1">required_documents (JSON array)</label>
              <textarea
                value={form.required_documents_json}
                onChange={(e) => setForm((f) => ({ ...f, required_documents_json: e.target.value }))}
                rows={2}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 font-mono text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 text-xs mb-1">deadline_metadata (JSON)</label>
              <textarea
                value={form.deadline_metadata_json}
                onChange={(e) => setForm((f) => ({ ...f, deadline_metadata_json: e.target.value }))}
                rows={2}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 font-mono text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create draft"}
            </button>
          </form>
        </section>

        {/* List */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-50">Programs ({programs.length})</h2>
          {loading ? (
            <p className="text-slate-400">Loading…</p>
          ) : programs.length === 0 ? (
            <p className="text-slate-400">No programs. Create a draft above or run the seed migration.</p>
          ) : (
            <ul className="divide-y divide-slate-800 space-y-2">
              {programs.map((p) => (
                <li key={p.id} className="py-3 first:pt-0">
                  {editingId === p.id ? (
                    <form onSubmit={handleUpdate} className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Name"
                          className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
                        />
                        <input
                          type="text"
                          value={form.program_key}
                          onChange={(e) => setForm((f) => ({ ...f, program_key: e.target.value }))}
                          placeholder="program_key"
                          className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
                        />
                        <input
                          type="text"
                          value={form.state_code}
                          onChange={(e) => setForm((f) => ({ ...f, state_code: e.target.value }))}
                          placeholder="State code"
                          className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
                        />
                        <textarea
                          value={form.rule_set_json}
                          onChange={(e) => setForm((f) => ({ ...f, rule_set_json: e.target.value }))}
                          rows={6}
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 font-mono text-xs sm:col-span-2"
                        />
                        <textarea
                          value={form.required_documents_json}
                          onChange={(e) => setForm((f) => ({ ...f, required_documents_json: e.target.value }))}
                          rows={2}
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 font-mono text-xs sm:col-span-2"
                        />
                        <textarea
                          value={form.deadline_metadata_json}
                          onChange={(e) => setForm((f) => ({ ...f, deadline_metadata_json: e.target.value }))}
                          rows={2}
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 font-mono text-xs sm:col-span-2"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-100">{p.name}</span>
                        <span className="font-mono text-xs text-slate-400">{p.program_key}</span>
                        {p.state_code && (
                          <span className="text-xs text-slate-500">{p.state_code}</span>
                        )}
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${
                            p.status === "active"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : p.status === "draft"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : "bg-slate-600 text-slate-400"
                          }`}
                        >
                          {p.status}
                          {p.is_active ? " · active" : ""}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-xs text-slate-400 mt-1">{p.description}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {p.status === "draft" && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(p)}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleActivate(p.id)}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300"
                            >
                              Activate
                            </button>
                          </>
                        )}
                        {p.status === "active" && (
                          <button
                            type="button"
                            onClick={() => handleArchive(p.id)}
                            className="text-[11px] text-amber-400 hover:text-amber-300"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </>
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
