// components/TopNav.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
import { logAuthEvent } from "@/lib/auditClient";
import { useSafetySettings } from "@/lib/client/safety/useSafetySettings";
import { clearSensitiveLocalState } from "@/lib/client/safety/quickExit";
export default function TopNav() {
  const router = useRouter();
  const { loading, user, role, realRole, isAdmin, accessToken, refetchMe } = useAuth();
  const usingDefaultRole = realRole != null && role === realRole;
  const { lang, setLang, t } = useI18n();
  const [viewAsLoading, setViewAsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const { strictPreviews, settings } = useSafetySettings(accessToken);
  const [quickExitLoading, setQuickExitLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken) {
        setUnreadCount(null);
        return;
      }
      try {
        const res = await fetch("/api/notifications?unreadOnly=true&limit=50", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          const items = Array.isArray(json.notifications) ? json.notifications : [];
          setUnreadCount(items.length);
        }
      } catch {
        if (!cancelled) setUnreadCount(null);
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [accessToken]);

  const setViewAs = async (viewRole: "victim" | "advocate" | "clear") => {
    if (!accessToken || !isAdmin) return;
    setViewAsLoading(true);
    try {
      const res = await fetch("/api/me/view-as", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ role: viewRole === "clear" ? "" : viewRole }),
        credentials: "include",
      });
      if (res.ok) await refetchMe();
    } finally {
      setViewAsLoading(false);
    }
  };

  const handleLogout = async () => {
    const { data } = await supabase.auth.getSession();
    await logAuthEvent("auth.logout", data.session?.access_token);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed:", error);
      return;
    }
    router.replace("/login");
    router.refresh();
  };

  const handleQuickExit = async () => {
    if (!accessToken) return;
    setQuickExitLoading(true);
    try {
      const res = await fetch("/api/safety/quick-exit", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json().catch(() => ({}));
      // Quick Exit should not leave an authenticated session behind.
      // Signing out prevents background refresh attempts with missing tokens.
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      if (settings?.clear_local_state_on_quick_exit !== false) {
        clearSensitiveLocalState(user?.id ?? null);
      }
      const redirectTo = typeof json?.redirectTo === "string" ? json.redirectTo : "/";
      router.replace(redirectTo);
      router.refresh();
    } finally {
      setQuickExitLoading(false);
    }
  };

  const dashboardLabel = isAdmin
    ? role === "advocate"
      ? t("nav.dashboardAdvocate")
      : t("nav.dashboardVictim")
    : "My account";

  return (
    <header className="border-b border-slate-800 bg-gradient-to-b from-[#0A2239] to-[#020b16]/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-[#1C8C8C] flex items-center justify-center text-xs font-bold tracking-wide text-slate-950">
            N
          </div>
          <div className="text-sm">
            <div className="font-semibold tracking-[0.14em] uppercase text-slate-200">
              NxtStps
            </div>
            <div className="text-[11px] text-slate-400">{t("nav.brandTagline")}</div>
          </div>
        </Link>

        <nav className="flex items-center gap-3 text-xs text-slate-200">
          <label className="flex items-center gap-2 rounded-full border border-slate-600 px-3 py-1.5">
            <span className="text-[11px] text-slate-300">{t("nav.language")}</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as "en" | "es")}
              className="bg-transparent text-slate-200 text-[11px] outline-none"
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
          </label>

          {loading ? (
            <span className="text-[11px] text-slate-400">{t("common.loading")}</span>
          ) : user ? (
            <>
              {isAdmin && (
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>View as:</span>
                  <button
                    type="button"
                    disabled={viewAsLoading}
                    onClick={() => setViewAs("victim")}
                    className={`rounded px-2 py-0.5 ${role === "victim" ? "bg-slate-600 text-slate-100" : "hover:bg-slate-700/60 text-slate-400"}`}
                  >
                    Victim
                  </button>
                  <button
                    type="button"
                    disabled={viewAsLoading}
                    onClick={() => setViewAs("advocate")}
                    className={`rounded px-2 py-0.5 ${role === "advocate" ? "bg-slate-600 text-slate-100" : "hover:bg-slate-700/60 text-slate-400"}`}
                  >
                    Advocate
                  </button>
                  <button
                    type="button"
                    disabled={viewAsLoading}
                    onClick={() => setViewAs("clear")}
                    className={`rounded px-2 py-0.5 ${usingDefaultRole ? "bg-slate-600 text-slate-100" : "hover:bg-slate-700/60 text-slate-500"}`}
                    title="Use my actual account role"
                  >
                    Default
                  </button>
                </span>
              )}
              <Link
                href={isAdmin ? "/dashboard" : "/coming-soon"}
                className="rounded-full border border-slate-600 px-3 py-1.5 hover:bg-slate-900/60"
              >
                {dashboardLabel}
              </Link>

              <Link
                href="/notifications"
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 text-slate-200 hover:bg-slate-900/60"
                aria-label="Notifications"
              >
                <span className="text-lg leading-none">🔔</span>
                {unreadCount && unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-h-[16px] min-w-[16px] rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <Link
                href="/settings/safety"
                className="rounded-full border border-slate-600 px-3 py-1.5 hover:bg-slate-900/60 text-[11px]"
                title="Safety settings"
              >
                Safety
              </Link>

              <button
                type="button"
                onClick={handleQuickExit}
                disabled={quickExitLoading}
                className="rounded-full border border-rose-500/50 px-3 py-1.5 hover:bg-rose-500/10 text-[11px] text-rose-200 disabled:opacity-60"
                title={strictPreviews ? "Quick Exit" : "Quick Exit (clears local state and redirects)"}
              >
                {quickExitLoading ? "Exiting…" : "Quick Exit"}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-slate-600 px-3 py-1.5 hover:bg-slate-900/60"
              >
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-slate-600 px-3 py-1.5 hover:bg-slate-900/60"
            >
              {t("nav.login")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}