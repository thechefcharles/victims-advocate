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
  profile_status?: string | null;
  profile_stage?: string | null;
};

type PendingProposal = {
  id: string;
  created_at: string;
  created_by: string;
  created_by_email: string | null;
  status: string;
  name: string;
  type: string;
  address: string;
  phone: string;
  website: string | null;
  program_type: string | null;
  notes: string | null;
};

export default function AdminOrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [proposals, setProposals] = useState<PendingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<"nonprofit" | "hospital" | "gov" | "other">("nonprofit");
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

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

    const propRes = await fetch("/api/admin/pending-org-proposals", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (propRes.ok) {
      const propJson = await propRes.json();
      setProposals(propJson.data?.proposals ?? []);
    } else {
      setProposals([]);
    }
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
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-slate-400">
              Admin · Organizations
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold">Organizations</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-xl">
              Create org records and open each org to manage profile, designation, and workflows.
            </p>
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
            <Link
              href="/admin/grading"
              className="inline-flex items-center rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-600"
            >
              CBO grading
            </Link>
            <Link
              href="/admin/designations"
              className="text-sm text-slate-400 hover:text-white"
            >
              Designations
            </Link>
            <Link
              href="/admin/designation-reviews"
              className="text-sm text-amber-400 hover:text-amber-200"
            >
              Designation reviews
            </Link>
          </div>
        </header>

        {proposals.filter((p) => p.status === "pending").length > 0 && (
          <section className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5">
            <h2 className="text-sm font-semibold text-amber-100 mb-3">
              Pending organization proposals ({proposals.filter((p) => p.status === "pending").length})
            </h2>
            <p className="text-xs text-amber-200/80 mb-4">
              Orgs not in the directory — submitted by users for admin approval.
            </p>
            <ul className="space-y-4">
              {proposals
                .filter((p) => p.status === "pending")
                .map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-100">{p.name}</p>
                        <p className="text-xs text-slate-400">
                          {p.type}
                          {p.program_type ? ` · ${p.program_type}` : ""}
                        </p>
                        {p.address && (
                          <p className="text-xs text-slate-500 mt-1">{p.address}</p>
                        )}
                        {(p.phone || p.website) && (
                          <p className="text-xs text-slate-500">
                            {p.phone}
                            {p.phone && p.website && " · "}
                            {p.website && (
                              <a
                                href={p.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:underline"
                              >
                                Website
                              </a>
                            )}
                          </p>
                        )}
                        {p.created_by_email && (
                          <p className="text-xs text-slate-500 mt-1">
                            Submitted by {p.created_by_email}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setActingId(p.id);
                            try {
                              const { data: sessionData } = await supabase.auth.getSession();
                              const token = sessionData.session?.access_token;
                              if (!token) return;
                              const res = await fetch(
                                `/api/admin/pending-org-proposals/${p.id}/approve`,
                                {
                                  method: "POST",
                                  headers: { Authorization: `Bearer ${token}` },
                                }
                              );
                              if (res.ok) await load();
                              else {
                                const json = await res.json().catch(() => ({}));
                                setErr(getApiErrorMessage(json, "Could not approve"));
                              }
                            } finally {
                              setActingId(null);
                            }
                          }}
                          disabled={actingId !== null}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {actingId === p.id ? "…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setActingId(p.id);
                            try {
                              const { data: sessionData } = await supabase.auth.getSession();
                              const token = sessionData.session?.access_token;
                              if (!token) return;
                              const res = await fetch(
                                `/api/admin/pending-org-proposals/${p.id}/decline`,
                                {
                                  method: "POST",
                                  headers: { Authorization: `Bearer ${token}` },
                                }
                              );
                              if (res.ok) await load();
                              else {
                                const json = await res.json().catch(() => ({}));
                                setErr(getApiErrorMessage(json, "Could not decline"));
                              }
                            } finally {
                              setActingId(null);
                            }
                          }}
                          disabled={actingId !== null}
                          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                        >
                          {actingId === p.id ? "…" : "Decline"}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
          <p className="text-sm text-slate-300 flex-1 min-w-[200px]">
            Run internal <strong className="text-white">CBO quality grading</strong> per org
            (scores stay admin-only; designations use this behind the scenes).
          </p>
          <Link
            href="/admin/grading"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 shadow-sm"
          >
            Review
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">
            Create
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
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
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
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">
              <p className="font-medium text-slate-300">No organizations yet.</p>
              <p className="mt-2 text-xs text-slate-500">
                Create an organization above to onboard a partner and assign advocates.
              </p>
            </div>
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
                      {o.profile_status != null && o.profile_status !== ""
                        ? ` · profile ${o.profile_status}`
                        : ""}
                      {o.profile_stage != null && o.profile_stage !== ""
                        ? ` · stage ${o.profile_stage}`
                        : ""}
                    </span>
                  </div>
                  <Link
                    href={`/advocate/org?organization_id=${o.id}`}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    Open
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
