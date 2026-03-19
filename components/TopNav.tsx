// components/TopNav.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
import { logAuthEvent } from "@/lib/auditClient";
import { useSafetySettings } from "@/lib/client/safety/useSafetySettings";
import { clearSensitiveLocalState } from "@/lib/client/safety/quickExit";
import { getDashboardPath } from "@/lib/dashboardRoutes";

export default function TopNav() {
  const router = useRouter();
  const { loading, user, accessToken, isAdmin, role, orgId, orgRole } = useAuth();
  const dashboardHref = user
    ? getDashboardPath({ isAdmin, orgId, orgRole, role })
    : "/login";
  const { lang, setLang, t } = useI18n();
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const { strictPreviews, settings } = useSafetySettings(accessToken);
  const [quickExitLoading, setQuickExitLoading] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountMenuOpen]);

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
          const items = Array.isArray(json.data?.notifications)
            ? json.data.notifications
            : Array.isArray(json.notifications)
              ? json.notifications
              : [];
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

          <Link
            href="/compensation"
            className="rounded-full border border-slate-600 px-3 py-1.5 hover:bg-slate-900/60"
          >
            Home
          </Link>

          {loading ? (
            <span className="text-[11px] text-slate-400">{t("common.loading")}</span>
          ) : user ? (
            <>
              <Link
                href={dashboardHref}
                className="rounded-full border border-slate-600 px-3 py-1.5 hover:bg-slate-900/60"
              >
                {t("nav.dashboard")}
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

              <div className="flex items-center gap-2">
                <div className="relative" ref={accountMenuRef}>
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((o) => !o)}
                    className="flex max-w-[11rem] sm:max-w-[16rem] items-center gap-1.5 rounded-full border border-slate-600 px-3 py-1.5 text-left hover:bg-slate-900/60"
                    aria-expanded={accountMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Account menu"
                  >
                    <span className="truncate text-[11px] text-slate-100">
                      {user.email ?? "Account"}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] text-slate-400 transition ${accountMenuOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    >
                      ▾
                    </span>
                  </button>
                  {accountMenuOpen && (
                    <div
                      className="absolute right-0 top-[calc(100%+6px)] z-[100] min-w-[12rem] overflow-hidden rounded-xl border border-slate-600 bg-[#0c1e32] py-1 shadow-xl shadow-black/40"
                      role="menu"
                    >
                      <div className="border-b border-slate-700/80 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">Signed in</p>
                        <p className="truncate text-xs text-slate-200" title={user.email ?? undefined}>
                          {user.email ?? "—"}
                        </p>
                      </div>
                      <Link
                        href="/account"
                        role="menuitem"
                        className="block px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/80"
                        onClick={() => setAccountMenuOpen(false)}
                      >
                        {t("nav.myAccount")}
                      </Link>
                      <Link
                        href="/settings/safety"
                        role="menuitem"
                        className="block px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/80"
                        onClick={() => setAccountMenuOpen(false)}
                      >
                        Safety
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full border-t border-slate-700/80 px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800/80"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          void handleLogout();
                        }}
                      >
                        {t("nav.logout")}
                      </button>
                    </div>
                  )}
                </div>

                <Link
                  href="/notifications"
                  className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-600 text-slate-200 hover:bg-slate-900/60"
                  aria-label="Notifications"
                >
                  <span className="text-lg leading-none">🔔</span>
                  {unreadCount && unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 min-h-[16px] min-w-[16px] rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              </div>
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