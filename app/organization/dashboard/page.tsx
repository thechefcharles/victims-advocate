"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConsentRedirect } from "@/components/auth/useConsentRedirect";

type AdvocateRow = {
  id: string;
  user_id: string;
  org_role: string;
  created_at: string;
  profile_role: string | null;
};

export default function OrganizationDashboardPage() {
  const { accessToken } = useAuth();
  const consentReady = useConsentRedirect(accessToken, "/organization/dashboard");
  const [advocates, setAdvocates] = useState<AdvocateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!consentReady) return;
    let cancelled = false;
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/org/advocates", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(getApiErrorMessage(json, "Could not load advocates"));
          setAdvocates([]);
          return;
        }
        const list = json.data?.advocates ?? json.advocates ?? [];
        if (!cancelled) setAdvocates(Array.isArray(list) ? list : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [consentReady]);

  if (!consentReady) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto text-sm text-slate-400">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Organization</p>
          <h1 className="text-2xl font-semibold mt-1">Your organization</h1>
          <p className="text-sm text-slate-400 mt-2">
            Victim advocates in your organization (by profile role). Invite staff via{" "}
            <Link href="/advocate/org" className="text-emerald-400 hover:underline">
              org settings
            </Link>
            .
          </p>
        </header>

        {err && (
          <div className="text-sm text-red-300 border border-red-500/30 rounded-lg px-3 py-2">{err}</div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : advocates.length === 0 ? (
          <p className="text-sm text-slate-400">
            No victim advocates in this org yet. Add members with the advocate profile role.
          </p>
        ) : (
          <ul className="space-y-2">
            {advocates.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm flex justify-between gap-3"
              >
                <span className="font-mono text-xs text-slate-300 truncate" title={a.user_id}>
                  Advocate · {a.user_id.slice(0, 8)}…
                </span>
                <span className="text-slate-500 text-xs">{a.org_role}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <Link href="/advocate/org" className="underline hover:text-slate-300">
            Org workspace &amp; invites
          </Link>
          <Link href="/" className="underline hover:text-slate-300">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
