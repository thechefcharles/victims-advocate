// components/TopNav.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
import { logAuthEvent } from "@/lib/auditClient";
import { useSafetySettings } from "@/lib/client/safety/useSafetySettings";
import { clearSensitiveLocalState } from "@/lib/client/safety/quickExit";
import { ROUTES } from "@/lib/routes/pageRegistry";

/** Nav pills — secondary (slate); avoid competing with page primary CTAs */
const NAV_PRIMARY =
  "rounded-full border border-slate-700 bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600 transition";
/** Secondary — plain text (browse, utilities) */
const NAV_TEXT =
  "text-xs text-slate-300 hover:text-slate-100 px-1.5 py-1 rounded-md hover:bg-slate-900/40 transition";
/** Quick exit — compact rose X (top right; distinct from primary actions) */
const NAV_QUICK_EXIT =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-500/70 bg-rose-950/50 text-rose-100 hover:bg-rose-900/55 hover:text-white disabled:opacity-50 transition";

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, user, accessToken, isAdmin, role, orgId, orgRole } = useAuth();
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

  const refreshUnreadCount = useCallback(async () => {
    if (!accessToken) {
      setUnreadCount(null);
      return;
    }
    try {
      const res = await fetch("/api/notifications?unreadOnly=true&limit=50", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      const items = Array.isArray(json.data?.notifications)
        ? json.data.notifications
        : Array.isArray(json.notifications)
          ? json.notifications
          : [];
      setUnreadCount(items.length);
    } catch {
      setUnreadCount(null);
    }
  }, [accessToken]);

  useEffect(() => {
    void refreshUnreadCount();
    const id = setInterval(() => void refreshUnreadCount(), 60_000);
    return () => clearInterval(id);
  }, [refreshUnreadCount, pathname]);

  useEffect(() => {
    const onUnreadChanged = () => void refreshUnreadCount();
    window.addEventListener("notifications-unread-changed", onUnreadChanged);
    return () => window.removeEventListener("notifications-unread-changed", onUnreadChanged);
  }, [refreshUnreadCount]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void refreshUnreadCount();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refreshUnreadCount]);

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

  const showOrgLink = Boolean(orgId);
  const showOrgNavForOrgRole = role === "organization" && showOrgLink;
  const isVictim = role === "victim";
  const isAdvocate = role === "advocate";

  const languageSelect = (
    <label className="flex items-center gap-2 rounded-md border border-slate-700/80 px-2 py-1">
      <span className="text-[11px] text-slate-500">{t("nav.language")}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as "en" | "es")}
        className="bg-transparent text-slate-200 text-[11px] outline-none"
      >
        <option value="en">EN</option>
        <option value="es">ES</option>
      </select>
    </label>
  );

  return (
    <header className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-2">
          <Link href={ROUTES.marketingLanding} className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold tracking-wide text-white">
              N
            </div>
            <div className="text-sm">
              <div className="font-semibold uppercase tracking-[0.14em] text-slate-200">NxtStps</div>
              <div className="text-[11px] text-slate-400">{t("nav.brandTagline")}</div>
            </div>
          </Link>

          {/* Primary navigation — role-aware */}
          <nav
            className="flex flex-wrap items-center gap-2 sm:ml-2"
            aria-label="Main navigation"
          >
            {loading ? (
              <span className="text-[11px] text-slate-400">{t("common.loading")}</span>
            ) : !user ? (
              <>
                <Link href={ROUTES.compensationHub} className={NAV_PRIMARY}>
                  {t("nav.compensationHub")}
                </Link>
                <Link href={ROUTES.help} className={NAV_PRIMARY}>
                  {t("nav.help")}
                </Link>
              </>
            ) : isVictim ? (
              <>
                <Link href={ROUTES.victimDashboard} className={NAV_PRIMARY}>
                  {t("nav.mySupport")}
                </Link>
                <Link href={ROUTES.victimMessages} className={NAV_PRIMARY}>
                  {t("nav.messages")}
                </Link>
                <Link href={ROUTES.help} className={NAV_PRIMARY}>
                  {t("nav.help")}
                </Link>
              </>
            ) : (
              <>
                {!isAdvocate && (
                  <Link href={ROUTES.compensationHub} className={NAV_TEXT}>
                    {t("nav.compensationHub")}
                  </Link>
                )}
                <Link href={ROUTES.help} className={NAV_TEXT}>
                  {t("nav.help")}
                </Link>
                {isAdmin && (
                  <Link href={ROUTES.adminDashboard} className={NAV_PRIMARY}>
                    {t("nav.adminHome")}
                  </Link>
                )}
                {isAdvocate && (
                  <>
                    <Link href={ROUTES.advocateHome} className={NAV_PRIMARY}>
                      {t("nav.myDashboardAdvocate")}
                    </Link>
                    <Link href={ROUTES.advocateMessages} className={NAV_PRIMARY}>
                      {t("nav.messages")}
                    </Link>
                    {showOrgLink && (
                      <Link href={ROUTES.advocateOrg} className={NAV_PRIMARY}>
                        {t("nav.organization")}
                      </Link>
                    )}
                  </>
                )}
                {showOrgNavForOrgRole && (
                  <Link href={ROUTES.advocateOrg} className={NAV_PRIMARY}>
                    {t("nav.organization")}
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0">
          {languageSelect}

          {loading ? null : user ? (
            <>
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((o) => !o)}
                  className="flex max-w-[11rem] items-center gap-1.5 rounded-full border border-slate-600 px-3 py-1.5 text-left hover:bg-slate-900/60 sm:max-w-[16rem]"
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                >
                  <span className="text-[11px] text-slate-400">{t("nav.accountNav")}</span>
                  <span className="truncate text-[11px] text-slate-100">{user.email ?? "—"}</span>
                  <span
                    className={`shrink-0 text-[10px] text-slate-400 transition ${accountMenuOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    ▾
                  </span>
                </button>
                {accountMenuOpen && (
                  <div
                    className="absolute right-0 top-[calc(100%+6px)] z-[100] min-w-[12rem] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl shadow-black/40"
                    role="menu"
                  >
                    <div className="border-b border-slate-700/80 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Signed in</p>
                      <p className="truncate text-xs text-slate-200" title={user.email ?? undefined}>
                        {user.email ?? "—"}
                      </p>
                    </div>
                    <Link
                      href={ROUTES.account}
                      role="menuitem"
                      className="block px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/80"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      {t("nav.myAccount")}
                    </Link>
                    <Link
                      href={ROUTES.settingsSafety}
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
                href={ROUTES.notifications}
                className={`${NAV_TEXT} relative inline-flex items-center justify-center rounded-md p-1.5 hover:text-slate-100`}
                aria-label={t("nav.updates")}
                title={t("nav.updates")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                  />
                </svg>
                {unreadCount != null && unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={handleQuickExit}
                disabled={quickExitLoading}
                className={NAV_QUICK_EXIT}
                aria-label={
                  strictPreviews ? "Quick Exit" : "Quick Exit — clears local state and redirects"
                }
                title={
                  strictPreviews ? "Quick Exit" : "Quick Exit (clears local state and redirects)"
                }
              >
                {quickExitLoading ? (
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-rose-300/80 border-t-transparent"
                    aria-hidden
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </>
          ) : (
            <Link href={ROUTES.login} className={NAV_TEXT}>
              {t("nav.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
