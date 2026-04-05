"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { BetaPlatformAckDocument } from "@/components/legal/documents/BetaPlatformAckDocument";
import { LegalDocumentScrollRegion } from "@/components/legal/LegalDocumentScrollRegion";
import { SignupConsentChrome } from "@/components/legal/SignupConsentChrome";
import { getConsentFlowSteps, getLegalSupportEmail, getPlatformStatus } from "@/lib/legal/platformLegalConfig";

export default function SignupConsentBetaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken, loading: authLoading, refetchMe } = useAuth();
  const [scrollOk, setScrollOk] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirect")?.trim() || "/dashboard";
  const steps = getConsentFlowSteps();
  const supportEmail = getLegalSupportEmail();

  useEffect(() => {
    if (getPlatformStatus() === "production") {
      router.replace(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
    }
  }, [router, redirectTo]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !accessToken) {
      router.replace(`/login?returnTo=${encodeURIComponent("/signup/consent/beta")}`);
    }
  }, [authLoading, user, accessToken, router]);

  const canSubmit = scrollOk && agree && !submitting;

  const onContinue = async () => {
    if (!accessToken || !canSubmit) return;
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/legal/consent/step", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ step: "beta", agreeBeta: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.message ?? "Something went wrong. Please try again.");
        return;
      }
      await refetchMe();
      router.push(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  if (getPlatformStatus() === "production") {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] px-6 py-10 text-[var(--color-navy)]">
        <p className="text-sm text-[var(--color-muted)]">Redirecting…</p>
      </main>
    );
  }

  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] px-6 py-10 text-[var(--color-navy)]">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <SignupConsentChrome steps={steps} activeStepId="beta">
      <header className="space-y-2 pr-14 sm:pr-0">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] sm:text-3xl">
          Beta platform acknowledgment
        </h1>
        <p className="text-base text-[var(--color-slate)]">
          Please read carefully before continuing
        </p>
      </header>

      <LegalDocumentScrollRegion onReachedEnd={setScrollOk}>
        <BetaPlatformAckDocument />
      </LegalDocumentScrollRegion>

      <div className="space-y-4" aria-live="polite">
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-base text-[var(--color-charcoal)]">
          <input
            type="checkbox"
            className="mt-1.5 h-[1.15rem] w-[1.15rem] shrink-0 rounded border-[var(--color-border)]"
            checked={agree}
            disabled={!scrollOk}
            onChange={(e) => setAgree(e.target.checked)}
            aria-label="I understand and acknowledge the beta platform notice"
          />
          <span>I understand and acknowledge this beta platform notice</span>
        </label>

        {err ? <p className="text-sm text-red-700">{err}</p> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--color-teal-deep)] px-5 text-base font-semibold text-white hover:bg-[var(--color-teal)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSubmit}
            onClick={() => void onContinue()}
          >
            I Agree and Continue
          </button>
          <Link
            href={`/?terms_declined=1&support=${encodeURIComponent(supportEmail)}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] px-5 text-base font-medium text-[var(--color-slate)] hover:bg-[var(--color-warm-cream)]"
          >
            Decline and return to homepage
          </Link>
        </div>
      </div>
    </SignupConsentChrome>
  );
}
