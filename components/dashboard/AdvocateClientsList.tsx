"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getApiErrorMessage } from "@/lib/utils/apiError";

export type ClientRow = {
  client_user_id: string;
  latest_case_id: string;
  latest_case_created_at: string;
  case_count: number;
  display_name: string;
};

type Props = {
  email: string | null;
  token: string | null;
  /** Hide the inline “Signed in as” line (e.g. when parent already shows it). */
  hideSignedInLine?: boolean;
};

export function AdvocateClientsList({ email, token, hideSignedInLine }: Props) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setClients([]);
      setErr("You’re not signed in yet. If this persists, go to /login.");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/advocate/clients", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        setClients([]);
        setErr("Session expired. Please log in again.");
        return;
      }
      if (res.status === 403) {
        setClients([]);
        setErr("This account is not set up as an advocate.");
        return;
      }

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setClients([]);
        setErr(getApiErrorMessage(json, "Couldn’t load your clients."));
        return;
      }

      setClients((json?.clients ?? []) as ClientRow[]);
    } catch (e) {
      console.error(e);
      setErr("Couldn’t load your clients. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <section className="rounded-2xl border border-teal-800/60 bg-teal-950/20 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-teal-100">My clients</h2>
          <p className="text-[11px] text-teal-200/60 mt-0.5">
            Survivors who have connected or invited you to their cases
          </p>
        </div>
        <button
          type="button"
          onClick={refetch}
          disabled={loading}
          className="text-[11px] rounded-full border border-teal-600/50 px-3 py-1.5 text-teal-200 hover:bg-teal-900/40 disabled:opacity-60"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {email && !hideSignedInLine && (
        <p className="text-[11px] text-teal-200/50">
          Signed in as <span className="text-teal-100/90">{email}</span>
        </p>
      )}

      {loading ? (
        <p className="text-[11px] text-teal-200/50">Loading…</p>
      ) : err ? (
        <p className="text-[11px] text-red-300">{err}</p>
      ) : clients.length === 0 ? (
        <p className="text-[11px] text-teal-200/50">
          No clients yet. Survivors can connect with you from the compensation page, or invite you to their case.
        </p>
      ) : (
        <div className="grid gap-3">
          {clients.map((c) => (
            <Link
              key={c.client_user_id}
              href={`/dashboard/clients/${c.client_user_id}`}
              className="rounded-xl border border-teal-800/50 bg-[#061a1c]/80 px-4 py-3 hover:border-teal-500/40 hover:bg-[#082428]/90 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-teal-50">{c.display_name}</div>
                  <div className="text-[11px] text-teal-200/55">
                    {c.case_count === 0
                      ? "Connected (no case yet)"
                      : `${c.case_count} case(s) • Latest: ${c.latest_case_created_at ? new Date(c.latest_case_created_at).toLocaleString() : "—"}`}
                  </div>
                </div>
                <div className="text-[11px] text-teal-300/80">Open →</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
