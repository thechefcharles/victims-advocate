"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { TermsOfUseV2Document } from "@/components/legal/documents/TermsOfUseV2Document";
import { LegalDocumentScrollRegion } from "@/components/legal/LegalDocumentScrollRegion";
import { SignupConsentChrome } from "@/components/legal/SignupConsentChrome";
import { getConsentFlowSteps, getLegalSupportEmail } from "@/lib/legal/platformLegalConfig";
import {
  readLegalOnboardingContext,
  syncLegalOnboardingContextFromSearchParams,
} from "@/lib/legal/legalOnboardingSession";

export default function SignupConsentTermsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken, loading: authLoading, refetchMe } = useAuth();
  const [scrollOk, setScrollOk] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [mfaConsent, setMfaConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirect")?.trim() || "/dashboard";
  const steps = getConsentFlowSteps();
  const supportEmail = getLegalSupportEmail();

  useEffect(() => {
    syncLegalOnboardingContextFromSearchParams(searchParams);
  }, [searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !accessToken) {
      router.replace(`/login?returnTo=${encodeURIComponent("/signup/consent/terms")}`);
    }
  }, [authLoading, user, accessToken, router]);

  const canSubmit = scrollOk && agreeTerms && mfaConsent && !submitting;

  const onContinue = async () => {
    if (!accessToken || !canSubmit) return;
    setErr(null);
    setSubmitting(true);
    const ctx = readLegalOnboardingContext();
    try {
      const res = await fetch("/api/legal/consent/step", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          step: "terms",
          agreeTerms: true,
          mfaSmsConsent: true,
          userType: ctx.userType,
          organizationId: ctx.organizationId,
          acceptingUserRole: ctx.acceptingUserRole,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.message ?? "Something went wrong. Please try again.");
        return;
      }
      await refetchMe();
      router.push(
        `/signup/consent/privacy?redirect=${encodeURIComponent(redirectTo)}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] px-6 py-10 text-[var(--color-navy)]">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <SignupConsentChrome steps={steps} activeStepId="terms">
      <header className="space-y-2 pr-14 sm:pr-0">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] sm:text-3xl">
          NxtStps Terms of Use
        </h1>
        <p className="text-base text-[var(--color-slate)]">
          Please read carefully before continuing
        </p>
      </header>

      <LegalDocumentScrollRegion onReachedEnd={setScrollOk}>
        <TermsOfUseV2Document />
      </LegalDocumentScrollRegion>

      <div className="space-y-4" aria-live="polite">
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-base text-[var(--color-charcoal)]">
          <input
            type="checkbox"
            className="mt-1.5 h-[1.15rem] w-[1.15rem] shrink-0 rounded border-[var(--color-border)]"
            checked={agreeTerms}
            disabled={!scrollOk}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            aria-label="I have read and agree to the NxtStps Terms of Use"
          />
          <span>I have read and agree to the NxtStps Terms of Use</span>
        </label>

        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-base text-[var(--color-charcoal)]">
          <input
            type="checkbox"
            className="mt-1.5 h-[1.15rem] w-[1.15rem] shrink-0 rounded border-[var(--color-border)]"
            checked={mfaConsent}
            disabled={!scrollOk}
            onChange={(e) => setMfaConsent(e.target.checked)}
            aria-label="I consent to receive text messages containing security codes from NxtStps for multi-factor authentication purposes"
          />
          <span>
            I consent to receive text messages containing security codes from NxtStps for
            multi-factor authentication purposes
          </span>
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
