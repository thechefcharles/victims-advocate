"use client";

import { useCallback, useEffect, useState } from "react";
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
  email: string | null;
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

type ReferralInboxRow = {
  referral: {
    id: string;
    case_id: string;
    created_at: string;
    status: string;
    requested_by_user_id: string;
  };
  case: { id: string; label: string; status: string };
  from_organization: { id: string; name: string } | null;
};

export default function OrganizationDashboardPage() {
  const { accessToken } = useAuth();
  const consentReady = useConsentRedirect(accessToken, "/organization/dashboard");
  const { strictPreviews } = useSafetySettings(accessToken);

  const [advocates, setAdvocates] = useState<AdvocateRow[]>([]);
  const [victims, setVictims] = useState<VictimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [publicProfileStatus, setPublicProfileStatus] = useState<string | null>(null);

  const [referrals, setReferrals] = useState<ReferralInboxRow[]>([]);
  const [refLoading, setRefLoading] = useState(true);
  const [refForbidden, setRefForbidden] = useState(false);
  const [refErr, setRefErr] = useState<string | null>(null);
  const [refActionId, setRefActionId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!consentReady || !accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/org/profile", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || cancelled) return;
        const st = json?.data?.profile?.public_profile_status;
        if (typeof st === "string" && !cancelled) setPublicProfileStatus(st);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [consentReady, accessToken]);

  const loadReferrals = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setRefLoading(true);
    setRefErr(null);
    try {
      const res = await fetch("/api/org/referrals?status=pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setRefForbidden(true);
        setReferrals([]);
        return;
      }
      if (!res.ok) {
        setRefErr(getApiErrorMessage(json, "Could not load referrals"));
        setReferrals([]);
        setRefForbidden(false);
        return;
      }
      const list = json.data?.referrals ?? [];
      setRefForbidden(false);
      setReferrals(Array.isArray(list) ? list : []);
    } finally {
      setRefLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!consentReady) return;
    void loadReferrals();
  }, [consentReady, loadReferrals]);

  const actOnReferral = async (referralId: string, action: "accept" | "decline") => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setRefActionId(referralId);
    setRefErr(null);
    try {
      const res = await fetch(`/api/org/referrals/${referralId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRefErr(getApiErrorMessage(json, `Could not ${action} referral`));
        return;
      }
      await loadReferrals();
    } finally {
      setRefActionId(null);
    }
  };

  const maskVictimLabel = (name: string, userId: string) => {
    if (!strictPreviews) return name || "Unknown";
    return `Victim ${userId.slice(0, 8)}…`;
  };

  if (!consentReady) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto text-sm text-slate-400">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-10">
        <header>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Organization</p>
          <h1 className="text-2xl font-semibold mt-1">My Dashboard</h1>
          <p className="text-sm text-slate-400 mt-2">
            Advocates in your agency and victims tied to cases. Manage staff and invites in{" "}
            <Link href="/advocate/org" className="text-emerald-400 hover:underline">
              Org settings
            </Link>
            .
          </p>
          {publicProfileStatus && publicProfileStatus !== "active" && (
            <p className="mt-3 text-sm text-slate-400 rounded-lg border border-slate-700/80 bg-slate-900/40 px-3 py-2">
              {publicProfileStatus === "pending_review" ? (
                <>
                  Your organization&apos;s public listing is{" "}
                  <span className="text-amber-200/90">under platform review</span>. Details and updates live
                  in{" "}
                  <Link href="/advocate/org" className="text-emerald-400 hover:underline">
                    Org settings
                  </Link>
                  .
                </>
              ) : publicProfileStatus === "paused" ? (
                <>
                  Public visibility is <span className="text-slate-200">paused</span>. Open{" "}
                  <Link href="/advocate/org" className="text-emerald-400 hover:underline">
                    Org settings
                  </Link>{" "}
                  for status and next steps.
                </>
              ) : (
                <>
                  Your organization is <span className="text-slate-200">not yet public</span>. Complete your
                  profile and submit for review in{" "}
                  <Link href="/advocate/org" className="text-emerald-400 hover:underline">
                    Org settings
                  </Link>
                  .
                </>
              )}
            </p>
          )}
        </header>

        {err && (
          <div className="text-sm text-red-300 border border-red-500/30 rounded-lg px-3 py-2">{err}</div>
        )}

        {!refForbidden ? (
          <section className="space-y-3">
            <h2 className="text-lg font-medium text-slate-100">Incoming referrals (pending)</h2>
            <p className="text-xs text-slate-500">
              Only open requests appear here. Accepting connects the case to your organization and completes the
              handoff. Declining closes the request and ends temporary review access. Accepted or declined items
              leave this list; case history stays on the case timeline for people with access.
            </p>
            {refErr ? (
              <div className="text-sm text-amber-200/90 border border-amber-700/40 rounded-lg px-3 py-2">
                {refErr}
              </div>
            ) : null}
            {refLoading ? (
              <p className="text-sm text-slate-400">Loading referrals…</p>
            ) : referrals.length === 0 ? (
              <p className="text-sm text-slate-400">
                Nothing waiting. When a survivor or partner sends a referral to your organization, it will show up
                here until someone accepts or declines.
              </p>
            ) : (
              <ul className="space-y-3">
                {referrals.map((row) => {
                  const rid = row.referral.id;
                  const busy = refActionId === rid;
                  const intakeHref = `/compensation/intake?case=${encodeURIComponent(row.case.id)}`;
                  return (
                    <li
                      key={rid}
                      className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm space-y-2"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium text-slate-100">{row.case.label}</span>
                        <span className="text-[11px] text-slate-500">
                          {new Date(row.referral.created_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <div>
                          Case ID{" "}
                          <span className="font-mono text-slate-400">
                            {strictPreviews ? `${row.case.id.slice(0, 8)}…` : row.case.id}
                          </span>
                          {row.case.status ? (
                            <>
                              {" "}
                              · <span className="text-slate-500">{row.case.status}</span>
                            </>
                          ) : null}
                        </div>
                        {row.from_organization ? (
                          <div>From organization: {row.from_organization.name}</div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Link
                          href={intakeHref}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800/80"
                        >
                          Review case
                        </Link>
                        <button
                          type="button"
                          disabled={busy || refActionId !== null}
                          onClick={() => void actOnReferral(rid, "accept")}
                          className="inline-flex items-center justify-center rounded-lg border border-emerald-600/50 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/50 disabled:opacity-50"
                        >
                          {busy ? "Working…" : "Accept & connect case"}
                        </button>
                        <button
                          type="button"
                          disabled={busy || refActionId !== null}
                          onClick={() => void actOnReferral(rid, "decline")}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800/80 disabled:opacity-50"
                        >
                          {busy ? "Working…" : "Decline request"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-100">Advocates in your organization</h2>
          <p className="text-xs text-slate-500">
            Team members with the advocate profile role (day-to-day case work).
          </p>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : advocates.length === 0 ? (
            <p className="text-sm text-slate-400">
              No victim advocates in this org yet. Invite staff in{" "}
              <Link href="/advocate/org" className="text-emerald-400 hover:underline">
                Org settings
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {advocates.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-slate-100">
                      {a.email ? (
                        <span title={a.user_id}>{a.email}</span>
                      ) : (
                        <span className="font-mono text-xs text-slate-400" title={a.user_id}>
                          {a.user_id.slice(0, 8)}…
                        </span>
                      )}
                    </span>
                    <span className="ml-2 text-slate-500 text-xs">{a.org_role}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

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

        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <Link href="/advocate/org" className="underline hover:text-slate-300">
            Org settings
          </Link>
          <Link href="/" className="underline hover:text-slate-300">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
