"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/components/i18n/i18nProvider";
import { logAuthEvent } from "@/lib/auditClient";

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
      await logAuthEvent("auth.password_reset_requested");
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="max-w-md w-full px-6 space-y-4 rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 p-6"
      >
        <h1 className="text-2xl font-semibold text-[var(--color-navy)]">
          {t("forgotPassword.title")}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">{t("forgotPassword.subtitle")}</p>

        <input
          className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)]"
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
          className="w-full rounded-lg bg-[var(--color-teal-deep)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
          type="submit"
          disabled={loading || !email.trim()}
        >
          {loading ? t("forgotPassword.sending") : t("forgotPassword.submit")}
        </button>

        <p className="text-center">
          <Link href="/login" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-charcoal)]">
            {t("forgotPassword.backToLogin")}
          </Link>
        </p>
      </form>
    </main>
  );
}