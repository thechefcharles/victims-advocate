"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
import { clearSensitiveLocalState } from "@/lib/client/safety/quickExit";
import { ROUTES } from "@/lib/routes/pageRegistry";

export function MarketingNav() {
  const { t, lang, setLang } = useI18n();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  const exitSafely = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    clearSensitiveLocalState(user?.id ?? null);
    window.location.replace("https://www.google.com");
  }, [user?.id]);

  const navLinkClass =
    "text-sm font-normal text-[var(--color-slate)] hover:text-[var(--color-teal-deep)] hover:underline underline-offset-2 transition-colors";

  const ctaPrimary =
    "inline-flex h-11 min-h-[44px] items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-teal-deep)] px-4 text-sm font-medium text-white hover:bg-[var(--color-teal)] transition-colors";

  const ctaGhost =
    "inline-flex h-11 min-h-[44px] items-center justify-center text-sm font-medium text-[var(--color-teal)] hover:text-[var(--color-teal-deep)] hover:underline underline-offset-2";

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border-light)] bg-[var(--color-warm-white)]">
      {/* Exit safely — thin bar above main nav */}
      <div className="border-b border-[var(--color-border-light)]/80 bg-[var(--color-warm-cream)]">
        <div className="mx-auto flex max-w-6xl justify-end px-4 py-1.5 sm:px-6">
          <button
            type="button"
            onClick={() => void exitSafely()}
            className="text-xs font-normal text-[var(--color-muted)] hover:text-[var(--color-charcoal)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-teal)] focus-visible:ring-offset-2 rounded-sm px-1"
          >
            {t("home.mkt.nav.exitSafely")}
          </button>
        </div>
      </div>

      <nav
        className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6"
        aria-label="Marketing"
      >
        <Link href={ROUTES.marketingLanding} className="min-w-0 shrink-0">
          <div className="font-semibold text-xl tracking-tight text-[var(--color-teal-deep)]">
            {t("home.mkt.nav.wordmark")}
          </div>
          <div className="text-[11px] font-normal text-[var(--color-muted)]">
            {t("home.mkt.nav.pilotLine")}
          </div>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-6 md:flex">
          <a href="#how-it-works" className={navLinkClass}>
            {t("home.mkt.nav.howItWorks")}
          </a>
          <a href="#interactive-demo" className={navLinkClass}>
            {t("home.mkt.nav.tryInteractiveDemo")}
          </a>
          <a href="#for-advocates" className={navLinkClass}>
            {t("home.mkt.nav.forAdvocates")}
          </a>
          <a href="#problem" className={navLinkClass}>
            {t("home.mkt.nav.problem")}
          </a>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <label className="flex items-center gap-1.5 rounded-md border border-[var(--color-border-light)] px-2 py-1 text-[11px] text-[var(--color-slate)]">
            <span className="sr-only">Language</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as "en" | "es")}
              className="bg-transparent text-[11px] outline-none"
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
          </label>
          <Link href="/login" className="inline-flex h-11 min-h-[44px] items-center justify-center rounded-[var(--radius-sm)] border-[1.5px] border-[var(--color-teal)] px-4 text-sm font-medium text-[var(--color-teal)] hover:bg-[var(--color-teal-light)] transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className={ctaPrimary}>
            Create account
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <label className="flex items-center rounded-md border border-[var(--color-border-light)] px-2 py-1 text-[11px]">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as "en" | "es")}
              className="bg-transparent text-[11px] outline-none text-[var(--color-slate)]"
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
          </label>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-navy)]"
            aria-expanded={drawerOpen}
            aria-controls="marketing-nav-drawer"
            onClick={() => setDrawerOpen((o) => !o)}
          >
            <span className="sr-only">{drawerOpen ? t("home.mkt.nav.closeMenu") : t("home.mkt.nav.openMenu")}</span>
            {drawerOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </nav>

      {drawerOpen && (
        <div
          id="marketing-nav-drawer"
          className="border-t border-[var(--color-border-light)] bg-[var(--color-warm-white)] px-4 py-4 md:hidden"
        >
          <div className="flex flex-col gap-3">
            <a href="#how-it-works" className={`${navLinkClass} py-2`} onClick={closeDrawer}>
              {t("home.mkt.nav.howItWorks")}
            </a>
            <a href="#interactive-demo" className={`${navLinkClass} py-2`} onClick={closeDrawer}>
              {t("home.mkt.nav.tryInteractiveDemo")}
            </a>
            <a href="#for-advocates" className={`${navLinkClass} py-2`} onClick={closeDrawer}>
              {t("home.mkt.nav.forAdvocates")}
            </a>
            <a href="#problem" className={`${navLinkClass} py-2`} onClick={closeDrawer}>
              {t("home.mkt.nav.problem")}
            </a>
            <Link href="/login" className="inline-flex h-11 min-h-[44px] items-center justify-center rounded-[var(--radius-sm)] border-[1.5px] border-[var(--color-teal)] px-4 text-sm font-medium text-[var(--color-teal)] hover:bg-[var(--color-teal-light)] transition-colors" onClick={closeDrawer}>
              Sign in
            </Link>
            <Link href="/signup" className={ctaPrimary} onClick={closeDrawer}>
              Create account
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
