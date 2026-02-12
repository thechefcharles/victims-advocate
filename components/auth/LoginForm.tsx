// components/auth/LoginForm.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/components/i18n/i18nProvider";

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
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErr(error.message);
        return;
      }

      // Redirect admins to MVP, non-admins to Coming Soon
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;

      if (!uid) {
        router.push("/coming-soon");
        return;
      }

      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", uid)
          .single();
        if (prof?.is_admin) {
          router.push("/dashboard");
        } else {
          router.push("/coming-soon");
        }
      } catch {
        router.push("/coming-soon");
      }
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

      <div className="text-sm opacity-80 flex gap-4">
        <Link className="underline" href="/signup">
          {t("loginForm.createAccount")}
        </Link>
        <Link className="underline" href="/signup/advocate">
          {t("loginForm.createAdvocateAccount")}
        </Link>
        <Link className="underline" href="/forgot-password">
          {t("loginForm.forgotPassword")}
        </Link>
      </div>
    </form>
  );
}