"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LiabilityWaiverV1Document } from "@/components/legal/documents/LiabilityWaiverV1Document";
import { LegalDocumentScrollRegion } from "@/components/legal/LegalDocumentScrollRegion";
import { SignupConsentChrome } from "@/components/legal/SignupConsentChrome";
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
  getConsentFlowSteps,
  getLegalSupportEmail,
  getPlatformStatus,
} from "@/lib/legal/platformLegalConfig";

export default function SignupConsentWaiverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken, loading: authLoading, refetchMe } = useAuth();
  const [scrollOk, setScrollOk] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [priorStepsOk, setPriorStepsOk] = useState(false);

  const redirectTo = searchParams.get("redirect")?.trim() || "/dashboard";
  const steps = getConsentFlowSteps();
  const redirectQuery = `redirect=${encodeURIComponent(redirectTo)}`;
  const supportEmail = getLegalSupportEmail();
  const platformStatus = getPlatformStatus();
  const isProduction = platformStatus === "production";
  const primaryLabel = isProduction ? "I Agree and Begin" : "I Agree and Continue";

  useEffect(() => {
    if (authLoading) return;
    if (!user || !accessToken) {
      router.replace(`/login?returnTo=${encodeURIComponent("/signup/consent/waiver")}`);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok || cancelled) {
        if (!cancelled) {
          router.replace(`/signup/consent/terms?${redirectQuery}`);
        }
        return;
      }
      const json = await res.json();
      const d = (json?.data ?? json) as Record<string, unknown>;
      const tv = d.termsVersionAccepted;
      const ta = d.termsAcceptedAt;
      const termsOk =
        typeof tv === "string" &&
        tv === CURRENT_TERMS_VERSION &&
        typeof ta === "string" &&
        ta.length > 0;
      const pv = d.privacyPolicyVersionAccepted;
      const pa = d.privacyPolicyAcceptedAt;
      const privacyOk =
        typeof pv === "string" &&
        pv === CURRENT_PRIVACY_POLICY_VERSION &&
        typeof pa === "string" &&
        pa.length > 0;
      if (!termsOk) {
        router.replace(`/signup/consent/terms?${redirectQuery}`);
        return;
      }
      if (!privacyOk) {
        router.replace(`/signup/consent/privacy?${redirectQuery}`);
        return;
      }
      if (!cancelled) setPriorStepsOk(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, accessToken, router, redirectQuery]);

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
        body: JSON.stringify({ step: "waiver", agreeWaiver: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.message ?? "Something went wrong. Please try again.");
        return;
      }
      await refetchMe();
      if (isProduction) {
        router.push(`/signup/consent/ready?${redirectQuery}`);
      } else {
        router.push(`/signup/consent/beta?${redirectQuery}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user || !priorStepsOk) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] px-6 py-10 text-[var(--color-navy)]">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <SignupConsentChrome steps={steps} activeStepId="waiver" completedStepIds={["terms", "privacy"]}>
      <header className="space-y-2 pr-14 sm:pr-0">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] sm:text-3xl">
          One More Step Before You Begin
        </h1>
        <p className="text-base text-[var(--color-slate)]">
          This agreement describes what NxtStps can and cannot do
        </p>
      </header>

      <section
        className="rounded-2xl border border-[var(--color-border-light)] bg-[#faf6f0] p-5 shadow-sm"
        style={{ fontSize: "max(1.125rem, 18px)" }}
        aria-labelledby="waiver-framing-heading"
      >
        <h2
          id="waiver-framing-heading"
          className="text-lg font-semibold text-[var(--color-navy)] sm:text-xl"
        >
          Before you begin, here is what this means:
        </h2>
        <ul className="mt-4 list-disc space-y-3 pl-6 leading-relaxed text-[var(--color-charcoal)]">
          <li>
            NxtStps helps you prepare and organize your application — the final decisions belong to the
            program you apply to, not to NxtStps.
          </li>
          <li>NxtStps cannot guarantee that any application will be approved.</li>
          <li>This agreement asks you to acknowledge those limits clearly.</li>
          <li>
            If you have questions about your specific situation, an applicant advocate or legal aid
            organization can help.
          </li>
          <li>If you are in crisis right now, see the support resources below.</li>
        </ul>
      </section>

      <nav
        aria-label="Support resources"
        className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface-2)] p-5 text-[var(--color-charcoal)] shadow-sm"
      >
        <p className="text-base font-semibold text-[var(--color-navy)]">Support Resources</p>
        <p className="mt-2 text-base text-[var(--color-slate)]">If you need support right now:</p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-base leading-relaxed">
          <li>
            988 Suicide and Crisis Lifeline: Call or text{" "}
            <a className="font-medium underline hover:text-[var(--color-navy)]" href="tel:988">
              988
            </a>
          </li>
          <li>Crisis Text Line: Text HOME to 741741</li>
          <li>
            Emergency: Call{" "}
            <a className="font-medium underline hover:text-[var(--color-navy)]" href="tel:911">
              911
            </a>
          </li>
        </ul>
      </nav>

      <LegalDocumentScrollRegion
        onReachedEnd={setScrollOk}
        regionAriaLabel="Liability Waiver. Scroll to read the full document."
      >
        <LiabilityWaiverV1Document />
      </LegalDocumentScrollRegion>

      <div className="space-y-4">
        {scrollOk ? (
          <p className="sr-only" role="status" aria-live="polite">
            You have reached the end of the Liability Waiver. You may use the agreement checkbox and
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
              aria-label="I understand and agree to these terms"
            />
            <span>I understand and agree to these terms</span>
          </label>

          {err ? <p className="text-sm text-red-700">{err}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--color-teal-deep)] px-5 text-base font-semibold text-white hover:bg-[var(--color-teal)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit}
              onClick={() => void onContinue()}
              aria-disabled={!canSubmit}
              aria-label={primaryLabel}
            >
              {primaryLabel}
            </button>
            <Link
              href={`/signup/consent/privacy?${redirectQuery}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] px-5 text-base font-medium text-[var(--color-slate)] hover:bg-[var(--color-warm-cream)]"
            >
              Go Back
            </Link>
            <Link
              href={`/?waiver_declined=1`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] px-5 text-base font-medium text-[var(--color-slate)] hover:bg-[var(--color-warm-cream)]"
            >
              Decline
            </Link>
          </div>
        </div>
      </div>
    </SignupConsentChrome>
  );
}
