"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type Org = {
  id: string;
  created_at: string;
  name: string;
  type: string;
  status: string;
};

export default function AdminOrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<"nonprofit" | "hospital" | "gov" | "other">("nonprofit");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
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
      setErr(getApiErrorMessage(json, "Failed to load organizations"));
      setOrgs([]);
      return;
    }
    const json = await res.json();
    setOrgs(json.data?.orgs ?? []);
    setErr(null);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setLoading(false);
  }, [orgs, err]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = createName.trim();
    if (!name) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/orgs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, type: createType }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Failed to create organization"));
        return;
      }
      setCreateName("");
      setErr(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-slate-400">
              Admin · Organizations
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold">Organizations</h1>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/cases"
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              ← Cases
            </Link>
            <Link
              href="/admin/audit"
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              Audit logs
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">
            Create organization
          </h2>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Organization name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 w-64"
            />
            <select
              value={createType}
              onChange={(e) =>
                setCreateType(e.target.value as "nonprofit" | "hospital" | "gov" | "other")
              }
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option value="nonprofit">Nonprofit</option>
              <option value="hospital">Hospital</option>
              <option value="gov">Government</option>
              <option value="other">Other</option>
            </select>
            <button
              type="submit"
              disabled={submitting || !createName.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create"}
            </button>
          </form>
        </section>

        {err && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">
            All organizations
          </h2>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : orgs.length === 0 ? (
            <p className="text-sm text-slate-400">
              No organizations yet. Create one above.
            </p>
          ) : (
            <ul className="space-y-2">
              {orgs.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
                >
                  <div>
                    <span className="font-medium text-slate-100">{o.name}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {o.type} · {o.status}
                    </span>
                  </div>
                  <Link
                    href={`/advocate/org?organization_id=${o.id}`}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Manage →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
