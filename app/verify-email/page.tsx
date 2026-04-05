"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading || !hasSession) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "USER_UPDATED" && session?.user?.email_confirmed_at) {
        router.replace("/dashboard");
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [loading, hasSession, router]);

  const handleResend = async () => {
    setResendMsg(null);
    setResending(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setResendMsg("Please log in again.");
        return;
      }
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.data?.sent) {
        setResendMsg("Verification email sent. Check your inbox.");
      } else {
        setResendMsg(
          json?.error?.message ||
            "We couldn't resend the verification email. Wait a minute and try again.",
        );
      }
    } catch {
      setResendMsg(
        "We couldn't reach the server to resend verification. Check your connection and try again.",
      );
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center">
        <p className="text-[var(--color-muted)]">Loading…</p>
      </main>
    );
  }

  if (!hasSession) {
    router.replace("/login");
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center">
        <p className="text-[var(--color-muted)]">Redirecting to login…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 p-6 space-y-4">
        <h1 className="text-xl font-semibold text-[var(--color-navy)]">Verify your email</h1>
        <p className="text-sm text-[var(--color-muted)]">
          We sent a verification link to your email. Click the link to activate your account, then
          you can use the app.
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          Didn’t get the email? Check spam, or request a new link below.
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="w-full rounded-lg bg-[var(--color-teal-deep)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
        >
          {resending ? "Sending…" : "Resend verification email"}
        </button>
        {resendMsg && (
          <p className="text-sm text-[var(--color-slate)]">{resendMsg}</p>
        )}
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
          className="w-full rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm text-[var(--color-charcoal)] hover:bg-[var(--color-light-sand)]"
        >
          Sign out
        </button>
        <p className="text-center">
          <Link href="/login" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-charcoal)]">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
