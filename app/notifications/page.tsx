"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSafetySettings } from "@/lib/client/safety/useSafetySettings";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { useI18n } from "@/components/i18n/i18nProvider";

type Notification = {
  id: string;
  created_at: string;
  status: string;
  type?: string;
  title: string;
  body: string | null;
  action_url: string | null;
  preview_safe: boolean;
  read_at?: string | null;
  dismissed_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

function dispatchNotificationsUnreadChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notifications-unread-changed"));
  }
}

function parseOrgJoinRequest(n: Notification): { requestId: string } | null {
  if (n.type !== "advocate_org_join_request") return null;
  const m = n.metadata ?? {};
  const ridRaw = m.request_id;
  const rid =
    typeof ridRaw === "string"
      ? ridRaw
      : ridRaw != null && String(ridRaw).length > 0
        ? String(ridRaw)
        : null;
  if (!rid) return null;
  return { requestId: rid };
}

function parseOrgRepJoinRequest(n: Notification): { requestId: string } | null {
  if (n.type !== "org_rep_join_request") return null;
  const m = n.metadata ?? {};
  const ridRaw = m.request_id;
  const rid =
    typeof ridRaw === "string"
      ? ridRaw
      : ridRaw != null && String(ridRaw).length > 0
        ? String(ridRaw)
        : null;
  if (!rid) return null;
  return { requestId: rid };
}

function parseConnectionRequest(n: Notification): {
  requestId: string;
  victimName: string;
  victimEmail: string | null;
  scopedToCase: boolean;
} | null {
  if (n.type !== "advocate_connection_request") return null;
  const m = n.metadata ?? {};
  const ridRaw = m.request_id;
  const rid =
    typeof ridRaw === "string"
      ? ridRaw
      : ridRaw != null && String(ridRaw).length > 0
        ? String(ridRaw)
        : null;
  if (!rid) return null;
  const victimName =
    typeof m.victim_display_name === "string" && m.victim_display_name.trim()
      ? m.victim_display_name.trim()
      : "Victim";
  const victimEmail = typeof m.victim_email === "string" ? m.victim_email.trim() : null;
  const scopedToCase = typeof m.case_id === "string" && m.case_id.length > 0;
  return { requestId: rid, victimName, victimEmail, scopedToCase };
}

function isNotificationRead(n: Notification): boolean {
  const s = String(n.status ?? "").toLowerCase();
  return s === "read" || Boolean(n.read_at);
}

function ReadCheckIcon({ label }: { label: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300"
      title={label}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4 text-emerald-400"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.082l-4-4a.75.75 0 011.06-1.06l3.3 3.3 7.493-9.802a.75.75 0 011.05-.137z"
          clipRule="evenodd"
        />
      </svg>
      <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
    </span>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { accessToken, role } = useAuth();
  const { t } = useI18n();
  const { strictPreviews } = useSafetySettings(accessToken);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Notification[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const json = await res.json().catch(() => ({}));
      const list = json.data?.notifications ?? json.notifications ?? [];
      setItems((Array.isArray(list) ? list : []) as Notification[]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDismiss = async (id: string) => {
    if (!accessToken) return;
    setUpdatingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/dismiss`, {
        method: "POST",
        cache: "no-store",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setItems((prev) => prev.filter((n) => n.id !== id));
        dispatchNotificationsUnreadChanged();
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOrgJoinDecision = async (
    notificationId: string,
    requestId: string,
    decision: "approve" | "decline",
    isOrgRepRequest: boolean
  ) => {
    if (!accessToken) return;
    setUpdatingId(notificationId);
    setActionError(null);
    try {
      const base = isOrgRepRequest
        ? "/api/org/rep-join-requests"
        : "/api/org/join-requests";
      const path =
        decision === "approve"
          ? `${base}/${encodeURIComponent(requestId)}/approve`
          : `${base}/${encodeURIComponent(requestId)}/decline`;
      const res = await fetch(path, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 404) {
          await fetch(`/api/notifications/${encodeURIComponent(notificationId)}/dismiss`, {
            method: "POST",
            cache: "no-store",
            headers: { Authorization: `Bearer ${accessToken}` },
          }).catch(() => {});
          setItems((prev) => prev.filter((n) => n.id !== notificationId));
          dispatchNotificationsUnreadChanged();
          setActionError(null);
          return;
        }
        setActionError(getApiErrorMessage(json, "Couldn’t update this request."));
        return;
      }
      await handleDismiss(notificationId);
    } catch {
      setActionError("Something went wrong. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConnectionDecision = async (
    notificationId: string,
    requestId: string,
    decision: "accept" | "decline"
  ) => {
    if (!accessToken) return;
    setUpdatingId(notificationId);
    setActionError(null);
    try {
      const path =
        decision === "accept"
          ? `/api/advocate-connections/${encodeURIComponent(requestId)}/accept`
          : `/api/advocate-connections/${encodeURIComponent(requestId)}/decline`;
      const res = await fetch(path, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 404) {
          await fetch(`/api/notifications/${encodeURIComponent(notificationId)}/dismiss`, {
            method: "POST",
            cache: "no-store",
            headers: { Authorization: `Bearer ${accessToken}` },
          }).catch(() => {});
          setItems((prev) => prev.filter((n) => n.id !== notificationId));
          dispatchNotificationsUnreadChanged();
          setActionError(null);
          return;
        }
        setActionError(getApiErrorMessage(json, "Couldn’t update this request."));
        return;
      }
      await handleDismiss(notificationId);
    } catch {
      setActionError("Something went wrong. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkRead = async (id: string) => {
    if (!accessToken) return;
    setUpdatingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "POST",
        cache: "no-store",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(getApiErrorMessage(json, "Could not mark as read."));
        return;
      }
      await load();
      dispatchNotificationsUnreadChanged();
      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  };

  const markReadButtonClass =
    "inline-flex items-center rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-60";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-100 mb-2">{t("notificationsPage.title")}</h1>
      <p className="text-xs text-slate-500 mb-4 max-w-xl">{t("notificationsPage.subtitle")}</p>
      {actionError && (
        <p className="text-sm text-red-300 mb-3" role="alert">
          {actionError}
        </p>
      )}
      {loading && <p className="text-sm text-slate-400">{t("common.loading")}</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-slate-400">{t("notificationsPage.empty")}</p>
      )}
      <ul className="mt-4 space-y-3">
        {items.map((n) => {
          const connAdv = parseConnectionRequest(n);
          const orgJoin = parseOrgJoinRequest(n);
          const orgRepJoin = parseOrgRepJoinRequest(n);
          const isRead = isNotificationRead(n);
          const isUnread = !isRead && String(n.status ?? "").toLowerCase() !== "dismissed";
          const isAdvocateConnection = connAdv !== null && isUnread;
          const isOrgJoinUnread =
            (orgJoin !== null || orgRepJoin !== null) && isUnread && role === "organization";
          const isVictimPendingUnread = n.type === "victim_connection_request_pending" && isUnread;

          return (
            <li
              key={n.id}
              className={`rounded-lg border px-4 py-3 text-sm ${
                isRead
                  ? "border-slate-700/90 border-l-2 border-l-emerald-500/55 bg-slate-900/50 text-slate-300"
                  : "border-slate-600 bg-slate-900 text-slate-100"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  {isRead ? <ReadCheckIcon label={t("notificationsPage.readBadgeLabel")} /> : null}
                  <div className="min-w-0 font-medium">
                    {isOrgJoinUnread
                      ? strictPreviews
                        ? t("notificationsPage.previewHiddenTitle")
                        : t("notificationsPage.orgJoinRequestIncomingTitle")
                      : isAdvocateConnection
                      ? strictPreviews
                        ? t("notificationsPage.previewHiddenTitle")
                        : t("notificationsPage.connectionRequestIncomingTitle")
                      : n.type === "victim_connection_request_pending"
                        ? strictPreviews
                          ? t("notificationsPage.previewHiddenTitle")
                          : t("notificationsPage.connectionRequestPendingTitle")
                        : strictPreviews
                          ? t("notificationsPage.previewHiddenTitle")
                          : n.title}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] uppercase tracking-wide text-slate-500">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>

              {isOrgJoinUnread ? (
                !strictPreviews && n.preview_safe && n.body ? (
                  <p className="mt-2 text-xs text-slate-300 whitespace-pre-line sm:pl-7">{n.body}</p>
                ) : null
              ) : isAdvocateConnection ? (
                <div className="mt-2 space-y-1 pl-0 sm:pl-7">
                  <p className="text-sm text-slate-100 font-medium">{connAdv.victimName}</p>
                  {connAdv.victimEmail ? (
                    <p className="text-xs text-slate-400">{connAdv.victimEmail}</p>
                  ) : null}
                  <p className="text-xs text-slate-500 mt-1">
                    {connAdv.scopedToCase
                      ? "Wants to connect with you on a case."
                      : "Wants to connect with you as their advocate."}
                  </p>
                </div>
              ) : isVictimPendingUnread ? (
                !strictPreviews && n.preview_safe && n.body ? (
                  <p className="mt-2 text-xs text-slate-300 whitespace-pre-line sm:pl-7">{n.body}</p>
                ) : null
              ) : (
                <>
                  {!strictPreviews && n.preview_safe && n.body && (
                    <p className="mt-2 text-xs text-slate-300 whitespace-pre-line sm:pl-7">{n.body}</p>
                  )}
                </>
              )}

              {isUnread && (
                <div className="mt-3 flex flex-wrap items-center gap-2 sm:pl-7">
                  {isOrgJoinUnread && (orgJoin ?? orgRepJoin) ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          void handleOrgJoinDecision(
                            n.id,
                            (orgJoin ?? orgRepJoin)!.requestId,
                            "approve",
                            orgRepJoin !== null
                          )
                        }
                        disabled={updatingId === n.id}
                        className="inline-flex items-center rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                      >
                        {updatingId === n.id ? "…" : t("notificationsPage.orgJoinApprove")}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleOrgJoinDecision(
                            n.id,
                            (orgJoin ?? orgRepJoin)!.requestId,
                            "decline",
                            orgRepJoin !== null
                          )
                        }
                        disabled={updatingId === n.id}
                        className="inline-flex items-center rounded-full border border-slate-500 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                      >
                        {updatingId === n.id ? "…" : t("notificationsPage.orgJoinDecline")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleMarkRead(n.id)}
                        disabled={updatingId === n.id}
                        className={markReadButtonClass}
                      >
                        {updatingId === n.id ? "…" : t("notificationsPage.markRead")}
                      </button>
                    </>
                  ) : isAdvocateConnection ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleConnectionDecision(n.id, connAdv.requestId, "accept")}
                        disabled={updatingId === n.id}
                        className="inline-flex items-center rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                      >
                        {updatingId === n.id ? "…" : "Accept"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleConnectionDecision(n.id, connAdv.requestId, "decline")}
                        disabled={updatingId === n.id}
                        className="inline-flex items-center rounded-full border border-slate-500 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                      >
                        {updatingId === n.id ? "…" : "Reject"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleMarkRead(n.id)}
                        disabled={updatingId === n.id}
                        className={markReadButtonClass}
                      >
                        {updatingId === n.id ? "…" : t("notificationsPage.markRead")}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleMarkRead(n.id)}
                      disabled={updatingId === n.id}
                      className={markReadButtonClass}
                    >
                      {updatingId === n.id ? "…" : t("notificationsPage.markRead")}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
