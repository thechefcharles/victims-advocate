"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type Member = {
  id: string;
  user_id: string;
  org_role: string;
  status: string;
  created_at: string;
  email?: string | null;
};

type Invite = {
  id: string;
  email: string;
  org_role: string;
  expires_at: string;
  created_at: string;
};

export default function AdvocateOrgPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"staff" | "supervisor" | "org_admin">("staff");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const getToken = () => {
    return supabase.auth.getSession().then(({ data }) => data.session?.access_token);
  };

  const loadMembers = async (token: string) => {
    const { searchParams } = new URL(window.location.href);
    const orgId = searchParams.get("organization_id");
    const url = orgId ? `/api/org/members?organization_id=${orgId}` : "/api/org/members";
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(getApiErrorMessage(json, "Failed to load members"));
    }
    const json = await res.json();
    return json.data?.members ?? [];
  };

  const loadInvites = async (token: string) => {
    const { searchParams } = new URL(window.location.href);
    const orgId = searchParams.get("organization_id");
    const url = orgId ? `/api/org/invites?organization_id=${orgId}` : "/api/org/invites";
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.invites ?? [];
  };

  useEffect(() => {
    const run = async () => {
      const token = await getToken();
      if (!token) {
        window.location.href = "/login";
        return;
      }
      try {
        const [m, inv] = await Promise.all([loadMembers(token), loadInvites(token)]);
        setMembers(m);
        setInvites(inv);
        setErr(null);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
        setMembers([]);
        setInvites([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    const token = await getToken();
    if (!token) return;
    setSubmitting(true);
    setInviteUrl(null);
    try {
      const res = await fetch("/api/org/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, org_role: inviteRole, expiry_days: 7 }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Failed to create invite"));
        return;
      }
      const url = json.data?.invite?.accept_url;
      if (url) {
        setInviteUrl(url);
        setInviteEmail("");
      }
      setErr(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("Revoke this invite?")) return;
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/org/invites/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ invite_id: inviteId }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setErr(getApiErrorMessage(json, "Failed to revoke invite"));
      return;
    }
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    setErr(null);
  };

  const handleRevokeMember = async (membershipId: string) => {
    if (!confirm("Revoke this member?")) return;
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/org/members/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ membership_id: membershipId }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setErr(getApiErrorMessage(json, "Failed to revoke"));
      return;
    }
    const m = members.filter((x) => x.id !== membershipId);
    setMembers(m);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
  };

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <Link
            href="/advocate"
            className="text-xs text-slate-400 hover:text-slate-200 mb-2 inline-block"
          >
            ← Back to advocate dashboard
          </Link>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            Organization
          </p>
          <h1 className="text-2xl font-semibold">Manage organization</h1>
        </header>

        {err && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        {inviteUrl && (
          <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-4 py-3 text-sm">
            <p className="font-medium text-emerald-200">Invite created</p>
            <p className="text-slate-300 mt-1 break-all">{inviteUrl}</p>
            <p className="text-xs text-slate-400 mt-1">
              Copy this link and send it to the invitee.
            </p>
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">
            Invite member
          </h2>
          <form onSubmit={handleCreateInvite} className="flex flex-wrap gap-3">
            <input
              type="email"
              placeholder="Email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 w-64"
            />
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "staff" | "supervisor" | "org_admin")
              }
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option value="staff">Staff</option>
              <option value="supervisor">Supervisor</option>
              <option value="org_admin">Org Admin</option>
            </select>
            <button
              type="submit"
              disabled={submitting || !inviteEmail.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create invite"}
            </button>
          </form>
        </section>

        {invites.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Pending invites</h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Role</th>
                  <th className="text-left py-2">Expires</th>
                  <th className="text-left py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-900">
                    <td className="py-2 text-slate-200">{inv.email}</td>
                    <td className="py-2 text-slate-300">{inv.org_role}</td>
                    <td className="py-2 text-slate-400">{formatDate(inv.expires_at)}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => handleRevokeInvite(inv.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Members</h2>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-slate-400">No members yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-2">Email / User</th>
                  <th className="text-left py-2">Role</th>
                  <th className="text-left py-2">Joined</th>
                  <th className="text-left py-2"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-slate-900">
                    <td className="py-2 text-slate-200">
                      {m.email || m.user_id.slice(0, 8) + "…"}
                    </td>
                    <td className="py-2 text-slate-300">{m.org_role}</td>
                    <td className="py-2 text-slate-400">{formatDate(m.created_at)}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => handleRevokeMember(m.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
