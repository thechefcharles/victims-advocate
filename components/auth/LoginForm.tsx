// components/auth/LoginForm.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/components/i18n/i18nProvider";
import { logAuthEvent } from "@/lib/auditClient";

export default function LoginForm() {
  const router = useRouter();
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const lockRes = await fetch(
        `/api/auth/check-lockout?email=${encodeURIComponent(normalizedEmail)}`
      );
      if (lockRes.ok) {
        const lockJson = await lockRes.json();
        if (lockJson.data?.locked) {
          setErr(t("loginForm.tooManyAttempts"));
          return;
        }
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        const failRes = await fetch("/api/auth/login-failed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
        });
        const failJson = await failRes.json().catch(() => ({}));
        if (failJson.data?.locked) {
          setErr(t("loginForm.tooManyAttempts"));
        } else {
          setErr(error.message);
        }
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      await logAuthEvent("auth.login", token);

      await fetch("/api/auth/login-success", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (token) {
        await fetch("/api/me/sync-profile-role", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetch("/api/org/complete-pending-signup", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const meRes = await fetch("/api/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (meRes.ok) {
        const meJson = await meRes.json();
        const data = meJson.data ?? {};
        if (data.accountStatus !== "active") {
          router.push("/account-disabled");
          return;
        }
        if (!data.emailVerified) {
          router.push("/verify-email");
          return;
        }
        // Route through /dashboard so email verification, consent, and org-intent routing stay consistent.
        router.push("/dashboard");
        return;
      }

      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{t("loginForm.title")}</h1>

      <input
        className="w-full border rounded-md p-2"
        placeholder={t("loginForm.emailPlaceholder")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        type="email"
      />

      <input
        className="w-full border rounded-md p-2"
        placeholder={t("loginForm.passwordPlaceholder")}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />

      {err && <div className="text-sm text-red-600">{err}</div>}

      <button
        className="w-full border rounded-md px-4 py-2"
        disabled={loading || !email.trim() || !password}
        type="submit"
      >
        {loading ? t("loginForm.loggingIn") : t("loginForm.submit")}
      </button>

      <div className="text-sm opacity-80 flex flex-wrap gap-4">
        <Link className="underline" href="/signup">
          {t("loginForm.createAccount")}
        </Link>
        <Link className="underline" href="/forgot-password">
          {t("loginForm.forgotPassword")}
        </Link>
      </div>
    </form>
  );
}