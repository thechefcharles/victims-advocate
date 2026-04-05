"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/components/i18n/i18nProvider";
import { logAuthEvent } from "@/lib/auditClient";
import { validatePassword } from "@/lib/passwordPolicy";

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

    const pv = validatePassword(password);
    if (!pv.valid) {
      setErr(pv.errors[0] ?? t("resetPassword.passwordTooShort"));
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
      const { data } = await supabase.auth.getSession();
      await logAuthEvent("auth.password_reset_completed", data.session?.access_token);
      await supabase.auth.signOut();
      setTimeout(() => router.push("/login"), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (hasRecoverySession === null) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          <p className="text-sm text-[var(--color-muted)]">{t("common.loading")}</p>
        </div>
      </main>
    );
  }

  if (hasRecoverySession === false) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center">
        <div className="max-w-md w-full px-6 space-y-4 text-center">
          <h1 className="text-xl font-semibold text-[var(--color-navy)]">
            {t("resetPassword.invalidOrExpired")}
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            {t("resetPassword.invalidOrExpiredHint")}
          </p>
          <Link
            href="/forgot-password"
            className="inline-block rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm hover:bg-[var(--color-light-sand)]"
          >
            {t("resetPassword.requestNewLink")}
          </Link>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center">
        <div className="max-w-md w-full px-6 space-y-4 text-center">
          <h1 className="text-xl font-semibold text-emerald-400">
            {t("resetPassword.successTitle")}
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            {t("resetPassword.successHint")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="max-w-md w-full px-6 space-y-4 rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 p-6"
      >
        <h1 className="text-2xl font-semibold text-[var(--color-navy)]">
          {t("resetPassword.title")}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">{t("resetPassword.subtitle")}</p>

        <input
          className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)]"
          placeholder={t("resetPassword.newPasswordPlaceholder")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <input
          className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)]"
          placeholder={t("resetPassword.confirmPasswordPlaceholder")}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        {err && <div className="text-sm text-red-400">{err}</div>}

        <button
          className="w-full rounded-lg bg-[var(--color-teal-deep)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
          type="submit"
          disabled={loading || !password || !confirmPassword || !validatePassword(password).valid}
        >
          {loading ? t("resetPassword.updating") : t("resetPassword.submit")}
        </button>

        <p className="text-center">
          <Link href="/login" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-charcoal)]">
            {t("resetPassword.backToLogin")}
          </Link>
        </p>
      </form>
    </main>
  );
}
