"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConsentRedirect } from "@/components/auth/useConsentRedirect";
import { ROUTES } from "@/lib/routes/pageRegistry";

type AdvocateCaseRow = {
  id: string;
  name?: string | null;
  owner_user_id?: string | null;
  application?: {
    victim?: { firstName?: string; lastName?: string };
  } | null;
};

type MessageRow = {
  id: string;
  created_at: string;
  sender_user_id: string;
  message_text?: string;
};

type QueueItem = {
  caseId: string;
  victimLabel: string;
  unreadCount: number;
  lastAt: string | null;
  preview: string;
};

const RECENT_MS = 14 * 24 * 60 * 60 * 1000;
const BATCH = 8;

function displayNameForCase(c: AdvocateCaseRow): string {
  if (c.name?.trim()) return c.name.trim();
  const v = c.application?.victim;
  const first = (v?.firstName ?? "").trim();
  const last = (v?.lastName ?? "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  return `Case ${c.id.slice(0, 8)}…`;
}

function truncatePreview(text: string, max = 90): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default function AdvocateMessagesPage() {
  const { accessToken } = useAuth();
  const consentReady = useConsentRedirect(accessToken, ROUTES.advocateMessages);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const listRes = await fetch("/api/advocate/cases", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!listRes.ok) {
        setErr("Couldn’t load cases.");
        setItems([]);
        return;
      }
      const listJson = await listRes.json();
      const cases = (listJson.cases ?? []) as AdvocateCaseRow[];

      const now = Date.now();
      const queue: QueueItem[] = [];

      for (let i = 0; i < cases.length; i += BATCH) {
        const slice = cases.slice(i, i + BATCH);
        const results = await Promise.all(
          slice.map(async (c) => {
            const res = await fetch(`/api/cases/${c.id}/messages`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return null;
            return res.json() as Promise<{
              messages?: MessageRow[];
              unread_count?: number;
            }>;
          })
        );

        for (let j = 0; j < slice.length; j++) {
          const c = slice[j];
          const json = results[j];
          if (!json) continue;
          const messages = (json.messages ?? []) as MessageRow[];
          const unreadCount = Number(json.unread_count ?? 0);
          if (messages.length === 0) continue;

          const sorted = [...messages].sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const last = sorted[0];
          const lastAt = last?.created_at ?? null;
          const ownerId = c.owner_user_id ?? "";

          const lastSurvivorMsg = sorted.find(
            (m) => ownerId && m.sender_user_id === ownerId
          );

          let preview = "";
          if (unreadCount > 0) {
            preview = lastSurvivorMsg?.message_text
              ? truncatePreview(lastSurvivorMsg.message_text)
              : "New secure message";
          } else {
            preview = lastSurvivorMsg?.message_text
              ? truncatePreview(lastSurvivorMsg.message_text)
              : truncatePreview(last.message_text ?? "");
          }

          const lastTime = lastAt ? new Date(lastAt).getTime() : 0;
          const recent = now - lastTime <= RECENT_MS;
          const include = unreadCount > 0 || recent;

          if (!include) continue;

          queue.push({
            caseId: c.id,
            victimLabel: displayNameForCase(c),
            unreadCount,
            lastAt,
            preview: preview || "New secure message",
          });
        }
      }

      queue.sort((a, b) => {
        const ua = a.unreadCount > 0 ? 1 : 0;
        const ub = b.unreadCount > 0 ? 1 : 0;
        if (ua !== ub) return ub - ua;
        const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
        const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
        return tb - ta;
      });

      setItems(queue);
    } catch (e) {
      console.error(e);
      setErr("Something went wrong loading messages.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (consentReady) void load();
  }, [consentReady, load]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!consentReady) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10">
        <div className="max-w-xl mx-auto text-sm text-slate-400">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <Link
            href={ROUTES.advocateHome}
            className="text-xs text-slate-400 hover:text-slate-200 mb-1 inline-block"
          >
            ← Back to Command Center
          </Link>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            Advocate
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">Secure Messages</h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Review survivor conversations that may need follow-up.
          </p>
          <p className="text-[11px] text-slate-500">
            Threads with unread messages or activity in the last 14 days are listed first.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-slate-400">Loading conversations…</p>
        ) : err ? (
          <div className="rounded-2xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-8 text-center space-y-4">
            <p className="text-sm text-slate-300">
              No recent secure message activity.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              When survivors message or threads are active, they&apos;ll appear here for quick
              triage.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href={ROUTES.advocateHome}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Back to Command Center
              </Link>
              <Link
                href={`${ROUTES.advocateHome}#case-work-queue`}
                className="inline-flex items-center justify-center rounded-full border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-900/60"
              >
                View Case Queue
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((row) => (
              <li
                key={row.caseId}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100 truncate">
                      {row.victimLabel}
                    </span>
                    {row.unreadCount > 0 && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 px-2 py-0.5">
                        {row.unreadCount} unread
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Latest activity · {formatDate(row.lastAt)}
                  </p>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {row.preview}
                  </p>
                </div>
                <Link
                  href={`${ROUTES.compensationIntake}?case=${row.caseId}`}
                  className="inline-flex shrink-0 items-center justify-center rounded-full border border-emerald-500/50 px-4 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/10"
                >
                  Open Case
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
