"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type UserRow = {
  id: string;
  email: string | null;
  role: string;
  orgId: string | null;
  account_status: string;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmail, setFilterEmail] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);

  const load = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 403) {
      window.location.href = "/dashboard";
      return;
    }
    if (!res.ok) {
      setUsers([]);
      setLoading(false);
      return;
    }
    const json = await res.json();
    setUsers(json.data?.users ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDisable = async (userId: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;
    setActioning(userId);
    try {
      const res = await fetch("/api/admin/users/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) await load();
    } finally {
      setActioning(null);
    }
  };

  const handleEnable = async (userId: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;
    setActioning(userId);
    try {
      const res = await fetch("/api/admin/users/enable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) await load();
    } finally {
      setActioning(null);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
  };

  const filtered = users.filter((u) => {
    if (filterEmail && !(u.email ?? "").toLowerCase().includes(filterEmail.toLowerCase()))
      return false;
    if (filterStatus && u.account_status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
        <div className="max-w-5xl mx-auto">Loading users…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-xs tracking-[0.25em] uppercase text-slate-400">
            Admin · User security
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold">Users</h1>
          <div className="flex flex-wrap gap-3 text-sm text-slate-400">
            <Link href="/admin/cases" className="hover:text-slate-200">
              Cases →
            </Link>
            <Link href="/admin/audit" className="hover:text-slate-200">
              Audit logs →
            </Link>
            <Link href="/admin/orgs" className="hover:text-slate-200">
              Organizations →
            </Link>
            <Link href="/admin/policies" className="hover:text-slate-200">
              Policies →
            </Link>
            <Link href="/admin/ecosystem" className="hover:text-teal-400">
              Ecosystem →
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Filter by email"
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 w-48"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-100"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>

        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                <th className="text-left py-2 px-3 font-normal">Email</th>
                <th className="text-left py-2 px-3 font-normal">Role</th>
                <th className="text-left py-2 px-3 font-normal">Status</th>
                <th className="text-left py-2 px-3 font-normal">Created</th>
                <th className="text-left py-2 px-3 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-slate-800/80 hover:bg-slate-800/40">
                  <td className="py-2 px-3 text-slate-200">{u.email ?? "—"}</td>
                  <td className="py-2 px-3 text-slate-300">{u.role}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 ${
                        u.account_status === "active"
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                          : "bg-amber-500/10 text-amber-300 border border-amber-500/40"
                      }`}
                    >
                      {u.account_status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-400">{formatDate(u.created_at)}</td>
                  <td className="py-2 px-3">
                    {u.account_status === "active" ? (
                      <button
                        type="button"
                        onClick={() => handleDisable(u.id)}
                        disabled={actioning === u.id}
                        className="text-amber-400 hover:text-amber-300 disabled:opacity-50"
                      >
                        {actioning === u.id ? "…" : "Disable"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEnable(u.id)}
                        disabled={actioning === u.id}
                        className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                      >
                        {actioning === u.id ? "…" : "Enable"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {filtered.length === 0 && (
          <p className="text-slate-400 text-sm">No users match the filters.</p>
        )}
      </div>
    </main>
  );
}
