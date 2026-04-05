"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
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

function AdvocateMessagesContent() {
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
      const caseRows = (listJson.cases ?? []) as AdvocateCaseRow[];

      const now = Date.now();
      const queue: QueueItem[] = [];

      for (let i = 0; i < caseRows.length; i += BATCH) {
        const slice = caseRows.slice(i, i + BATCH);
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

          const lastVictimMsg = sorted.find(
            (m) => ownerId && m.sender_user_id === ownerId
          );

          let preview = "";
          if (unreadCount > 0) {
            preview = lastVictimMsg?.message_text
              ? truncatePreview(lastVictimMsg.message_text)
              : "New Secure Message";
          } else {
            preview = lastVictimMsg?.message_text
              ? truncatePreview(lastVictimMsg.message_text)
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
            preview: preview || "New Secure Message",
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
      setErr(
        "We couldn't load your messages — the request was interrupted. Refresh the page and try again.",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <Link
            href={ROUTES.advocateHome}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-charcoal)] mb-1 inline-block"
          >
            ← Back to My Dashboard
          </Link>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">Advocate</p>
          <h1 className="text-2xl font-semibold text-[var(--color-navy)]">Messages</h1>
          <p className="text-sm text-[var(--color-muted)] max-w-xl">
            Use this triage list to spot new victim updates quickly. Open the case view to read
            and reply.
          </p>
          <p className="text-[11px] text-[var(--color-muted)]">
            Unread first, then recent. Use the case view to continue casework.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-[var(--color-muted)]">Loading cases…</p>
        ) : err ? (
          <div className="rounded-2xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 px-5 py-8 text-center space-y-4">
            <p className="text-sm text-[var(--color-slate)]">No unread or recent secure messages to show.</p>
            <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto">
              When a victim sends a message or a thread is active, the case will appear here. You
              can continue case updates from My Dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href={ROUTES.advocateHome}
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-teal-deep)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-teal)]"
              >
                Back to My Dashboard
              </Link>
              <Link
                href={`${ROUTES.advocateHome}#advocate-clients`}
                className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-5 py-2.5 text-sm font-semibold text-[var(--color-charcoal)] hover:bg-[var(--color-warm-cream)]/85"
              >
                View clients
              </Link>
            </div>
          </div>
        ) : items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((row) => {
              return (
                <li
                  key={row.caseId}
                  className="rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--color-navy)] truncate">
                        {row.victimLabel}
                      </span>
                      {row.unreadCount > 0 && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 px-2 py-0.5">
                          {row.unreadCount} unread
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-muted)]">
                      Latest victim update · {formatDate(row.lastAt)}
                    </p>
                    <p className="text-xs text-[var(--color-muted)] line-clamp-2">{row.preview}</p>
                  </div>
                  <Link
                    href={`/compensation/intake?case=${encodeURIComponent(row.caseId)}`}
                    className="inline-flex shrink-0 items-center justify-center rounded-full border border-emerald-500/50 px-4 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/10"
                  >
                    Open case
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </main>
  );
}

export default function AdvocateMessagesPage() {
  const { accessToken, loading: authLoading, legalConsentNextPath } = useAuth();
  const consentReady = useConsentRedirect(
    accessToken,
    ROUTES.advocateMessages,
    authLoading,
    legalConsentNextPath
  );

  if (!consentReady) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-6 py-10">
        <div className="max-w-xl mx-auto text-sm text-[var(--color-muted)]">Loading…</div>
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-6 py-10">
          <div className="max-w-xl mx-auto text-sm text-[var(--color-muted)]">Loading…</div>
        </main>
      }
    >
      <AdvocateMessagesContent />
    </Suspense>
  );
}
