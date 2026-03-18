"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/i18nProvider";

export default function AccountPage() {
  const { user, isAdmin } = useAuth();
  const { t } = useI18n();

  return (
    <RequireAuth>
      <main className="mx-auto max-w-lg px-4 py-12 text-slate-200">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">
          {t("nav.myAccount")}
        </p>
        <h1 className="text-2xl font-semibold text-slate-50 mb-6">
          {t("nav.accountPlaceholderTitle")}
        </h1>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Email</p>
            <p className="text-sm text-slate-200 break-all">{user?.email ?? "—"}</p>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">{t("nav.accountPlaceholderBody")}</p>
          <Link
            href={isAdmin ? "/admin/cases" : "/dashboard"}
            className="inline-block text-sm text-teal-400 hover:text-teal-300"
          >
            ← Dashboard
          </Link>
        </div>
      </main>
    </RequireAuth>
  );
}
