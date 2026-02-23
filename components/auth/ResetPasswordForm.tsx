"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/components/i18n/i18nProvider";

export default function ResetPasswordForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session) {
        setHasRecoverySession(true);
      } else {
        setHasRecoverySession(false);
      }
    };
    checkSession();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (password !== confirmPassword) {
      setErr(t("resetPassword.passwordsMismatch"));
      return;
    }

    if (password.length < 6) {
      setErr(t("resetPassword.passwordTooShort"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErr(error.message);
        return;
      }

      setSuccess(true);
      await supabase.auth.signOut();
      setTimeout(() => router.push("/login"), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (hasRecoverySession === null) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          <p className="text-sm text-slate-400">{t("common.loading")}</p>
        </div>
      </main>
    );
  }

  if (hasRecoverySession === false) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full px-6 space-y-4 text-center">
          <h1 className="text-xl font-semibold text-slate-100">
            {t("resetPassword.invalidOrExpired")}
          </h1>
          <p className="text-sm text-slate-400">
            {t("resetPassword.invalidOrExpiredHint")}
          </p>
          <Link
            href="/forgot-password"
            className="inline-block rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm hover:bg-slate-800"
          >
            {t("resetPassword.requestNewLink")}
          </Link>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#020b16] text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full px-6 space-y-4 text-center">
          <h1 className="text-xl font-semibold text-emerald-400">
            {t("resetPassword.successTitle")}
          </h1>
          <p className="text-sm text-slate-400">
            {t("resetPassword.successHint")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 flex items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="max-w-md w-full px-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6"
      >
        <h1 className="text-2xl font-semibold text-slate-100">
          {t("resetPassword.title")}
        </h1>
        <p className="text-sm text-slate-400">{t("resetPassword.subtitle")}</p>

        <input
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#1C8C8C]"
          placeholder={t("resetPassword.newPasswordPlaceholder")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <input
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#1C8C8C]"
          placeholder={t("resetPassword.confirmPasswordPlaceholder")}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        {err && <div className="text-sm text-red-400">{err}</div>}

        <button
          className="w-full rounded-lg bg-[#1C8C8C] px-4 py-2.5 font-semibold text-slate-950 hover:bg-[#21a3a3] disabled:opacity-50"
          type="submit"
          disabled={loading || !password || !confirmPassword}
        >
          {loading ? t("resetPassword.updating") : t("resetPassword.submit")}
        </button>

        <p className="text-center">
          <Link href="/login" className="text-sm text-slate-400 hover:text-slate-200">
            {t("resetPassword.backToLogin")}
          </Link>
        </p>
      </form>
    </main>
  );
}
