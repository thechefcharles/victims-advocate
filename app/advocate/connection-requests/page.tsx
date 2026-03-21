"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type PendingRequest = {
  id: string;
  victim_user_id: string;
  victim_email: string | null;
  status: string;
  created_at: string;
};

export default function AdvocateConnectionRequestsPage() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!accessToken) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/advocate-connections/pending", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 403) {
        setErr("This page is for advocates. Your account is not set up as an advocate.");
        setRequests([]);
        return;
      }
      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Failed to load connection requests"));
        setRequests([]);
        return;
      }

      setRequests((json.data?.requests ?? json.requests ?? []) as PendingRequest[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [accessToken]);

  const handleAccept = async (id: string) => {
    if (!accessToken) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/advocate-connections/${id}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Failed to accept"));
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (id: string) => {
    if (!accessToken) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/advocate-connections/${id}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Failed to decline"));
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setActionId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header>
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 mb-4"
          >
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold">Connection requests</h1>
          <p className="text-sm text-slate-300 mt-2">
            Survivors can request to connect with you as their advocate. Accept to add them as a
            client. Once accepted, they can invite you to their cases.
          </p>
        </header>

        {err && (
          <div className="text-sm text-red-300 border border-red-500/30 bg-red-500/10 rounded-lg px-4 py-3">
            {err}
          </div>
        )}

        {loading && <p className="text-sm text-slate-400">Loading…</p>}

        {!loading && requests.length === 0 && !err && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
            <p className="text-slate-300">No pending connection requests.</p>
            <p className="text-sm text-slate-500 mt-2">
              When a survivor sends you a request, it will appear here.
            </p>
          </div>
        )}

        {!loading && requests.length > 0 && (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-slate-100">
                    {r.victim_email ?? "Unknown"} wants to connect
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAccept(r.id)}
                    disabled={actionId !== null}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {actionId === r.id ? "…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(r.id)}
                    disabled={actionId !== null}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
