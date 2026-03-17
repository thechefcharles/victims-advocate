"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSafetySettings } from "@/lib/client/safety/useSafetySettings";

type Notification = {
  id: string;
  created_at: string;
  status: string;
  title: string;
  body: string | null;
  action_url: string | null;
  preview_safe: boolean;
  read_at?: string | null;
  dismissed_at?: string | null;
};

export default function NotificationsPage() {
  const { accessToken } = useAuth();
  const { strictPreviews } = useSafetySettings(accessToken);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Notification[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken) return;
      setLoading(true);
      try {
        const res = await fetch("/api/notifications", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        if (!cancelled) setItems((json.notifications ?? []) as Notification[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const updateItem = (id: string, patch: Partial<Notification>) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  const handleMarkRead = async (id: string) => {
    if (!accessToken) return;
    setUpdatingId(id);
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      updateItem(id, { status: "read", read_at: new Date().toISOString() } as any);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    if (!accessToken) return;
    setUpdatingId(id);
    try {
      await fetch(`/api/notifications/${id}/dismiss`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      updateItem(id, { status: "dismissed", dismissed_at: new Date().toISOString() } as any);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-100 mb-4">Notifications</h1>
      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-slate-400">You have no notifications right now.</p>
      )}
      <ul className="mt-4 space-y-3">
        {items.map((n) => (
          <li
            key={n.id}
            className={`rounded-lg border px-4 py-3 text-sm ${
              n.status === "read" || n.status === "dismissed"
                ? "border-slate-700 bg-slate-900/60 text-slate-300"
                : "border-slate-600 bg-slate-900 text-slate-100"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{strictPreviews ? "You have a new update" : n.title}</div>
              <span className="text-[11px] uppercase tracking-wide text-slate-500">
                {new Date(n.created_at).toLocaleString()}
              </span>
            </div>
            {!strictPreviews && n.preview_safe && n.body && (
              <p className="mt-1 text-xs text-slate-300">{n.body}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {n.action_url && (
                <Link
                  href={n.action_url}
                  className="inline-flex items-center rounded-full border border-slate-500 px-3 py-1 text-xs text-slate-100 hover:bg-slate-800"
                >
                  {strictPreviews ? "Open" : "View details"}
                </Link>
              )}
              {n.status !== "read" && n.status !== "dismissed" && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(n.id)}
                  disabled={updatingId === n.id}
                  className="inline-flex items-center rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                >
                  Mark read
                </button>
              )}
              {n.status !== "dismissed" && (
                <button
                  type="button"
                  onClick={() => handleDismiss(n.id)}
                  disabled={updatingId === n.id}
                  className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-900 disabled:opacity-60"
                >
                  Dismiss
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

