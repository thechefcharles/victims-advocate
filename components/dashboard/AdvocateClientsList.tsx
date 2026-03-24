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
  /** Called after a client is removed and the list has refreshed (e.g. reload parent dashboard data). */
  onClientRemoved?: () => void;
};

export function AdvocateClientsList({ email, token, hideSignedInLine, onClientRemoved }: Props) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<ClientRow | null>(null);

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

  useEffect(() => {
    if (!pendingRemove) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingRemove(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pendingRemove]);

  const executeRemove = useCallback(
    async (c: ClientRow) => {
      if (!token) return;
      setRemovingId(c.client_user_id);
      setErr(null);
      try {
        const res = await fetch(`/api/advocate/clients/${encodeURIComponent(c.client_user_id)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setErr(getApiErrorMessage(json, "Couldn’t remove this client."));
          return;
        }
        setPendingRemove(null);
        await refetch();
        onClientRemoved?.();
      } catch (e) {
        console.error(e);
        setErr("Couldn’t remove this client. Please try again.");
      } finally {
        setRemovingId(null);
      }
    },
    [token, refetch, onClientRemoved]
  );

  return (
    <>
      {pendingRemove && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-client-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && removingId === null) setPendingRemove(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-900 p-5 shadow-xl shadow-black/40">
            <h3 id="remove-client-title" className="text-base font-semibold text-white">
              Remove this client?
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              <span className="font-medium text-slate-100">{pendingRemove.display_name}</span> will
              be removed from your list. You will lose access to their cases and secure messages until
              they send a new connection request.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Pending notifications for this connection will be cleared.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingRemove(null)}
                disabled={removingId !== null}
                className="rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void executeRemove(pendingRemove)}
                disabled={removingId === pendingRemove.client_user_id}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {removingId === pendingRemove.client_user_id ? "Removing…" : "Remove Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-white">My clients</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Survivors who have connected or invited you to their cases
            </p>
          </div>
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="text-[11px] rounded-full bg-slate-700 px-3 py-1.5 font-medium text-white hover:bg-slate-600 disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {email && !hideSignedInLine && (
          <p className="text-[11px] text-slate-500">
            Signed in as <span className="text-slate-300">{email}</span>
          </p>
        )}

        {loading ? (
          <p className="text-[11px] text-slate-500">Loading…</p>
        ) : err ? (
          <p className="text-[11px] text-red-300">{err}</p>
        ) : clients.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            No clients yet. Survivors can connect with you from the compensation page, or invite you to their case.
          </p>
        ) : (
          <div className="grid gap-3">
            {clients.map((c) => (
              <div
                key={c.client_user_id}
                className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <Link
                  href={`/dashboard/clients/${c.client_user_id}`}
                  className="min-w-0 flex-1 hover:bg-slate-800/50 -mx-1 px-1 py-0.5 rounded-lg transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{c.display_name}</div>
                      <div className="text-[11px] text-slate-400">
                        {c.case_count === 0
                          ? "Connected (no case yet)"
                          : `${c.case_count} case(s) • Latest: ${c.latest_case_created_at ? new Date(c.latest_case_created_at).toLocaleString() : "—"}`}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-300 shrink-0 sm:hidden">Open →</div>
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0 justify-end">
                  <Link
                    href={`/dashboard/clients/${c.client_user_id}`}
                    className="text-[11px] text-slate-300 hover:text-white hidden sm:inline"
                  >
                    Open →
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingRemove(c)}
                    disabled={removingId === c.client_user_id}
                    className="text-[11px] rounded-full border border-rose-500/40 bg-rose-950/30 px-3 py-1.5 font-medium text-rose-100 hover:bg-rose-950/50 disabled:opacity-50"
                  >
                    {removingId === c.client_user_id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
