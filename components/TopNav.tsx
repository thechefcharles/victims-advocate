// components/TopNav.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";
export default function TopNav() {
  const router = useRouter();
  const { loading, user, role, isAdmin } = useAuth();
  const { lang, setLang, t } = useI18n();
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed:", error);
      return;
    }
    router.replace("/login");
    router.refresh();
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
              <Link
                href={isAdmin ? "/dashboard" : "/coming-soon"}
                className="rounded-full border border-slate-600 px-3 py-1.5 hover:bg-slate-900/60"
              >
                {dashboardLabel}
              </Link>

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