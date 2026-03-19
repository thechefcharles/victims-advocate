"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConsentRedirect } from "@/components/auth/useConsentRedirect";
import { useSafetySettings } from "@/lib/client/safety/useSafetySettings";

type AdvocateRow = {
  id: string;
  user_id: string;
  org_role: string;
  created_at: string;
  profile_role: string | null;
};

type VictimCaseRef = {
  id: string;
  status: string;
  created_at: string;
};

type VictimRow = {
  victim_user_id: string;
  display_name: string;
  case_count: number;
  cases: VictimCaseRef[];
};

export default function OrganizationDashboardPage() {
  const { accessToken } = useAuth();
  const consentReady = useConsentRedirect(accessToken, "/organization/dashboard");
  const { strictPreviews } = useSafetySettings(accessToken);

  const [advocates, setAdvocates] = useState<AdvocateRow[]>([]);
  const [victims, setVictims] = useState<VictimRow[]>([]);
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
        const [advRes, vicRes] = await Promise.all([
          fetch("/api/org/advocates", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/org/victims", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const advJson = await advRes.json().catch(() => ({}));
        const vicJson = await vicRes.json().catch(() => ({}));

        const errs: string[] = [];
        if (!advRes.ok) {
          setAdvocates([]);
          errs.push(getApiErrorMessage(advJson, "Could not load team"));
        } else {
          const list = advJson.data?.advocates ?? advJson.advocates ?? [];
          if (!cancelled) setAdvocates(Array.isArray(list) ? list : []);
        }

        if (!vicRes.ok) {
          setVictims([]);
          errs.push(getApiErrorMessage(vicJson, "Could not load victims"));
        } else {
          const list = vicJson.data?.victims ?? vicJson.victims ?? [];
          if (!cancelled) setVictims(Array.isArray(list) ? list : []);
        }

        if (!cancelled) setErr(errs.length ? errs.join(" ") : null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [consentReady]);

  const maskVictimLabel = (name: string, userId: string) => {
    if (!strictPreviews) return name || "Unknown";
    return `Victim ${userId.slice(0, 8)}…`;
  };

  if (!consentReady) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto text-sm text-slate-400">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-10">
        <header>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Organization</p>
          <h1 className="text-2xl font-semibold mt-1">Your organization</h1>
          <p className="text-sm text-slate-400 mt-2">
            Victims listed here are tied to cases assigned to your agency. Manage staff and invites in{" "}
            <Link href="/advocate/org" className="text-emerald-400 hover:underline">
              org settings
            </Link>
            .
          </p>
        </header>

        {err && (
          <div className="text-sm text-red-300 border border-red-500/30 rounded-lg px-3 py-2">{err}</div>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-100">Victims in your organization</h2>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : victims.length === 0 ? (
            <p className="text-sm text-slate-400">
              No cases are associated with your organization yet. When victims work with your advocates on
              applications, they will appear here.
            </p>
          ) : (
            <ul className="space-y-3">
              {victims.map((v) => (
                <li
                  key={v.victim_user_id}
                  className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-slate-100">
                      {maskVictimLabel(v.display_name, v.victim_user_id)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {v.case_count} case{v.case_count === 1 ? "" : "es"}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1.5 pl-0 list-none">
                    {v.cases.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <Link
                          href={`/compensation/intake?case=${encodeURIComponent(c.id)}`}
                          className="text-emerald-400 hover:underline font-mono"
                        >
                          {strictPreviews ? `Case ${c.id.slice(0, 8)}…` : `Open case ${c.id.slice(0, 8)}…`}
                        </Link>
                        <span className="text-slate-600">·</span>
                        <span>{c.status || "—"}</span>
                        {c.created_at && (
                          <>
                            <span className="text-slate-600">·</span>
                            <span>
                              {new Date(c.created_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-100">Advocate profiles in your org</h2>
          <p className="text-xs text-slate-500">
            Members with the advocate profile role (used for day-to-day case work).
          </p>
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
        </section>

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
