"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/components/i18n/i18nProvider";

export default function ForgotPasswordForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return setErr(error.message);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 flex items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="max-w-md w-full px-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6"
      >
        <h1 className="text-2xl font-semibold text-slate-100">
          {t("forgotPassword.title")}
        </h1>
        <p className="text-sm text-slate-400">{t("forgotPassword.subtitle")}</p>

        <input
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#1C8C8C]"
          placeholder={t("forgotPassword.emailPlaceholder")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        {err && <div className="text-sm text-red-400">{err}</div>}
        {sent && (
          <div className="text-sm text-emerald-400">
            {t("forgotPassword.sentHint")}
          </div>
        )}

        <button
          className="w-full rounded-lg bg-[#1C8C8C] px-4 py-2.5 font-semibold text-slate-950 hover:bg-[#21a3a3] disabled:opacity-50"
          type="submit"
          disabled={loading || !email.trim()}
        >
          {loading ? t("forgotPassword.sending") : t("forgotPassword.submit")}
        </button>

        <p className="text-center">
          <Link href="/login" className="text-sm text-slate-400 hover:text-slate-200">
            {t("forgotPassword.backToLogin")}
          </Link>
        </p>
      </form>
    </main>
  );
}