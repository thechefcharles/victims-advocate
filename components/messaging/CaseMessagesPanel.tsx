"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSafetySettings } from "@/lib/client/safety/useSafetySettings";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type Message = {
  id: string;
  created_at: string;
  sender_user_id: string;
  sender_role: string | null;
  message_text: string;
  status: "sent" | "edited" | "deleted";
};

export function CaseMessagesPanel({
  caseId,
  headingTitle,
  headingSubtitle,
  emptyStateText,
  /** When set, skips permission fetch and controls whether the composer is shown. */
  canSendOverride,
}: {
  caseId: string | null;
  /** Overrides the main heading (e.g. “Messages”) */
  headingTitle?: string;
  /** Overrides the default subtitle under the heading */
  headingSubtitle?: string;
  /** Overrides the empty thread message */
  emptyStateText?: string;
  canSendOverride?: boolean;
}) {
  const { accessToken } = useAuth();
  const { strictPreviews } = useSafetySettings(accessToken);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);
  /** null = still resolving; false = read-only viewer (e.g. pending referral review). */
  const [canSendMessages, setCanSendMessages] = useState<boolean | null>(
    () => (canSendOverride !== undefined ? canSendOverride : null)
  );

  const loadThread = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setErr(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/cases/${caseId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Couldn’t load messages."));
        return;
      }
      setMessages((json.data ?? json.messages ?? []) as Message[]);
      setUnreadCount(Number(json.unread_count ?? 0));
      // canSendMessage from thread view — only override when not using canSendOverride
      if (canSendOverride === undefined && typeof json.canSendMessage === "boolean") {
        setCanSendMessages(json.canSendMessage);
      }
    } catch (e) {
      console.error(e);
      setErr("Couldn’t load messages.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const markRead = useCallback(async (messageId: string) => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;
      await fetch(`/api/messages/${messageId}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    if (canSendOverride !== undefined) {
      setCanSendMessages(canSendOverride);
      return;
    }
    if (!caseId || !accessToken) {
      setCanSendMessages(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setCanSendMessages(null);
      try {
        const res = await fetch(`/api/compensation/cases/${caseId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const canEdit = Boolean((json as { access?: { can_edit?: boolean } }).access?.can_edit);
        setCanSendMessages(canEdit);
      } catch {
        if (!cancelled) setCanSendMessages(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, accessToken, canSendOverride]);

  useEffect(() => {
    // Best-effort mark messages as read when loaded (only ones not sent by current user)
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      for (const m of messages) {
        if (m.sender_user_id !== uid) {
          await markRead(m.id);
        }
      }
    })();
  }, [messages, markRead]);

  const send = useCallback(async () => {
    if (!caseId) return;
    if (canSendMessages !== true) return;
    const text = draft.trim();
    if (!text) return;

    setLoading(true);
    setErr(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/cases/${caseId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message_text: text }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setErr(getApiErrorMessage(json, "Couldn’t send message."));
        return;
      }
      setDraft("");
      await loadThread();
    } catch (e) {
      console.error(e);
      setErr("Couldn’t send message.");
    } finally {
      setLoading(false);
    }
  }, [caseId, draft, loadThread, canSendMessages]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!caseId) return null;

  return (
    <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-[var(--color-navy)]">
            {headingTitle ?? (strictPreviews ? "Messages" : "Secure messages")}
          </h2>
          <p className="text-[11px] text-[var(--color-muted)]">
            {headingSubtitle ??
              (strictPreviews
                ? "Secure messages for this case."
                : `Messages for this case only—no email or SMS.${unreadCount > 0 ? ` ${unreadCount} unread.` : ""}`)}
          </p>
        </div>
        <button
          type="button"
          onClick={loadThread}
          disabled={loading}
          className="text-[11px] rounded-full bg-[var(--color-teal-deep)] px-3 py-1.5 font-medium text-white hover:bg-[var(--color-teal)] disabled:opacity-60"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {err && <div className="text-[11px] text-red-300">{err}</div>}

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-3 max-h-64 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="text-[11px] text-[var(--color-muted)]">
            {emptyStateText ??
              "No messages yet. You can send the first message from this case."}
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-xs">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold text-[var(--color-charcoal)]">
                  {m.sender_role === "victim" ? "Applicant" : "Advocate"}
                </span>
                <span className="text-[10px] text-[var(--color-muted)]">{formatTime(m.created_at)}</span>
              </div>
              {m.status === "deleted" ? (
                <div className="text-[11px] text-[var(--color-muted)] italic">Message deleted</div>
              ) : (
                <div className="text-[11px] text-[var(--color-navy)] whitespace-pre-wrap">
                  {m.message_text}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {canSendMessages === false ? (
        <p className="text-[11px] text-[var(--color-muted)] border border-[var(--color-border-light)] rounded-lg px-3 py-2 bg-[var(--color-warm-cream)]/80">
          View only — you can read this thread but do not have permission to send messages on this case.
        </p>
      ) : canSendMessages === true ? (
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message…"
            rows={2}
            className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)]/60 focus:border-[var(--color-teal)]/60"
          />
          <button
            type="button"
            onClick={send}
            disabled={loading || !draft.trim()}
            className="rounded-xl bg-[var(--color-teal-deep)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-60"
          >
            Send
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-[var(--color-muted)]">Loading message permissions…</p>
      )}

    </section>
  );
}

