"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PrivacyPolicyV2Document } from "@/components/legal/documents/PrivacyPolicyV2Document";
import { LegalDocumentScrollRegion } from "@/components/legal/LegalDocumentScrollRegion";
import { SignupConsentChrome } from "@/components/legal/SignupConsentChrome";
import { CURRENT_TERMS_VERSION, getConsentFlowSteps } from "@/lib/legal/platformLegalConfig";

export default function SignupConsentPrivacyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken, loading: authLoading, refetchMe } = useAuth();
  const [scrollOk, setScrollOk] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [termsGatePassed, setTermsGatePassed] = useState(false);

  const redirectTo = searchParams.get("redirect")?.trim() || "/dashboard";
  const steps = getConsentFlowSteps();
  const redirectQuery = `redirect=${encodeURIComponent(redirectTo)}`;

  useEffect(() => {
    if (authLoading) return;
    if (!user || !accessToken) {
      router.replace(`/login?returnTo=${encodeURIComponent("/signup/consent/privacy")}`);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok || cancelled) {
        if (!cancelled) {
          router.replace(
            `/signup/consent/terms?redirect=${encodeURIComponent(redirectTo)}`
          );
        }
        return;
      }
      const json = await res.json();
      const d = (json?.data ?? json) as Record<string, unknown>;
      const tv = d.termsVersionAccepted;
      const ta = d.termsAcceptedAt;
      const ok =
        typeof tv === "string" &&
        tv === CURRENT_TERMS_VERSION &&
        typeof ta === "string" &&
        ta.length > 0;
      if (!ok) {
        router.replace(
          `/signup/consent/terms?redirect=${encodeURIComponent(redirectTo)}`
        );
        return;
      }
      if (!cancelled) setTermsGatePassed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, accessToken, router, redirectTo]);

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
        body: JSON.stringify({ step: "privacy", agreePrivacy: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.message ?? "Something went wrong. Please try again.");
        return;
      }
      await refetchMe();
      router.push(`/signup/consent/waiver?${redirectQuery}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user || !termsGatePassed) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] px-6 py-10 text-[var(--color-navy)]">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <SignupConsentChrome steps={steps} activeStepId="privacy" completedStepIds={["terms"]}>
      <header className="space-y-2 pr-14 sm:pr-0">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] sm:text-3xl">
          NxtStps Privacy Policy
        </h1>
        <p className="text-base text-[var(--color-slate)]">How we handle your information</p>
      </header>

      <section
        className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)] p-5 shadow-sm"
        style={{ fontSize: "max(1.125rem, 18px)" }}
        aria-labelledby="privacy-plain-language-heading"
      >
        <h2
          id="privacy-plain-language-heading"
          className="text-lg font-semibold text-[var(--color-navy)] sm:text-xl"
        >
          In plain language, here is what you should know:
        </h2>
        <ul className="mt-4 list-disc space-y-3 pl-6 leading-relaxed text-[var(--color-charcoal)]">
          <li>We only collect the information you choose to share with us.</li>
          <li>We never sell your data or share it for commercial purposes.</li>
          <li>We never use your information to train AI systems.</li>
          <li>We never use your information for advertising of any kind.</li>
          <li>
            Your information is protected under federal victim confidentiality laws including VOCA and
            VAWA.
          </li>
          <li>
            If you are in danger, look for the &quot;Exit Safely&quot; button visible on every screen — it
            closes the platform immediately.
          </li>
          <li>You can request deletion of your data at any time.</li>
        </ul>
        <p className="mt-5 text-base leading-relaxed text-[var(--color-muted)] sm:text-[17px]">
          You are in control of your information. We are here to help, not to collect.
        </p>
      </section>

      <LegalDocumentScrollRegion onReachedEnd={setScrollOk}>
        <PrivacyPolicyV2Document />
      </LegalDocumentScrollRegion>

      <div className="space-y-4">
        {scrollOk ? (
          <p className="sr-only" role="status" aria-live="polite">
            You have reached the end of the privacy policy. You may use the agreement checkbox and
            continue button.
          </p>
        ) : null}

        <div aria-live="polite" className="space-y-4">
          <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-base text-[var(--color-charcoal)]">
            <input
              type="checkbox"
              className="mt-1.5 h-[1.15rem] w-[1.15rem] shrink-0 rounded border-[var(--color-border)]"
              checked={agree}
              disabled={!scrollOk}
              onChange={(e) => setAgree(e.target.checked)}
              aria-label="I have read and agree to the NxtStps Privacy Policy"
            />
            <span>I have read and agree to the NxtStps Privacy Policy</span>
          </label>

          {err ? <p className="text-sm text-red-700">{err}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--color-teal-deep)] px-5 text-base font-semibold text-white hover:bg-[var(--color-teal)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit}
              onClick={() => void onContinue()}
              aria-disabled={!canSubmit}
            >
              I Agree and Continue
            </button>
            <Link
              href={`/signup/consent/terms?${redirectQuery}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] px-5 text-base font-medium text-[var(--color-slate)] hover:bg-[var(--color-warm-cream)]"
            >
              Go Back
            </Link>
            <Link
              href={`/?privacy_declined=1`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] px-5 text-base font-medium text-[var(--color-slate)] hover:bg-[var(--color-warm-cream)]"
            >
              Decline and return to homepage
            </Link>
          </div>
        </div>
      </div>
    </SignupConsentChrome>
  );
}
