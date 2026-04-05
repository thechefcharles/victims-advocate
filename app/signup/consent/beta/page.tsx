"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { BetaPilotAcknowledgmentV1Document } from "@/components/legal/documents/BetaPilotAcknowledgmentV1Document";
import { LegalDocumentScrollRegion } from "@/components/legal/LegalDocumentScrollRegion";
import { SignupConsentChrome } from "@/components/legal/SignupConsentChrome";
import { CURRENT_PILOT_ACK_VERSION, getConsentFlowSteps, getPlatformStatus } from "@/lib/legal/platformLegalConfig";

export default function SignupConsentBetaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken, loading: authLoading, refetchMe } = useAuth();
  const [scrollOk, setScrollOk] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [gatePassed, setGatePassed] = useState(false);

  const redirectTo = searchParams.get("redirect")?.trim() || "/dashboard";
  const steps = getConsentFlowSteps();
  const redirectQuery = `redirect=${encodeURIComponent(redirectTo)}`;

  useEffect(() => {
    if (getPlatformStatus() === "production") {
      router.replace(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
    }
  }, [router, redirectTo]);

  useEffect(() => {
    if (getPlatformStatus() === "production") return;
    if (authLoading) return;
    if (!user || !accessToken) {
      router.replace(`/login?returnTo=${encodeURIComponent("/signup/consent/beta")}`);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok || cancelled) {
        if (!cancelled) router.replace(`/signup/consent/terms?${redirectQuery}`);
        return;
      }
      const json = await res.json();
      const d = (json?.data ?? json) as Record<string, unknown>;
      const next =
        typeof d.legalConsentNextPath === "string" && d.legalConsentNextPath.startsWith("/")
          ? d.legalConsentNextPath
          : null;

      const pilotAckComplete =
        d.pilotAckVersionAccepted === CURRENT_PILOT_ACK_VERSION &&
        typeof d.pilotAckAcceptedAt === "string" &&
        (d.pilotAckAcceptedAt as string).length > 0;

      if (pilotAckComplete) {
        router.replace(`/signup/consent/ready?${redirectQuery}`);
        return;
      }

      if (next && next !== "/signup/consent/beta") {
        router.replace(`${next}?${redirectQuery}`);
        return;
      }

      if (!cancelled) setGatePassed(true);
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
        body: JSON.stringify({ step: "beta", agreeBeta: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.message ?? "Something went wrong. Please try again.");
        return;
      }
      await refetchMe();
      router.push(`/signup/consent/ready?${redirectQuery}`);
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

  if (authLoading || !user || !gatePassed) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] px-6 py-10 text-[var(--color-navy)]">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <SignupConsentChrome
      steps={steps}
      activeStepId="beta"
      completedStepIds={["terms", "privacy", "waiver"]}
    >
      <header className="space-y-2 pr-14 sm:pr-0">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] sm:text-3xl">
          One Last Thing Before You Begin
        </h1>
        <p className="text-base text-[var(--color-slate)]">
          What you should know about this version of NxtStps
        </p>
      </header>

      <section
        className="rounded-2xl border border-[var(--color-border-light)] bg-[#faf6f0] p-5 shadow-sm"
        style={{ fontSize: "max(1.125rem, 18px)" }}
        aria-labelledby="beta-framing-heading"
      >
        <h2
          id="beta-framing-heading"
          className="text-lg font-semibold text-[var(--color-navy)] sm:text-xl"
        >
          What you should know about this version of NxtStps
        </h2>
        <ul className="mt-4 list-disc space-y-3 pl-6 leading-relaxed text-[var(--color-charcoal)]">
          <li>This is an early version of NxtStps, actively being built and improved.</li>
          <li>You may encounter things that don&apos;t work perfectly. Please tell us when that happens.</li>
          <li>
            Your data is fully protected — the platform&apos;s development stage does not change any of
            NxtStps&apos;s privacy or confidentiality obligations.
          </li>
          <li>Your feedback helps us build something better for every victim who uses this platform after you.</li>
        </ul>
      </section>

      <LegalDocumentScrollRegion
        onReachedEnd={setScrollOk}
        regionAriaLabel="Beta platform and pilot program acknowledgment. Scroll to read the full document."
      >
        <BetaPilotAcknowledgmentV1Document />
      </LegalDocumentScrollRegion>

      <div className="space-y-4">
        {scrollOk ? (
          <p className="sr-only" role="status" aria-live="polite">
            You have reached the end of the acknowledgment. You may use the agreement checkbox and continue
            button.
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
              aria-label="I understand that NxtStps is an early-stage platform in active development and I am voluntarily participating in the pilot program"
            />
            <span>
              I understand that NxtStps is an early-stage platform in active development and I am voluntarily
              participating in the pilot program
            </span>
          </label>

          {err ? <p className="text-sm text-red-700">{err}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--color-teal-deep)] px-5 text-base font-semibold text-white hover:bg-[var(--color-teal)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit}
              onClick={() => void onContinue()}
              aria-disabled={!canSubmit}
              aria-label="Final consent — I Understand and Begin"
            >
              I Understand and Begin
            </button>
            <Link
              href={`/signup/consent/waiver?${redirectQuery}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] px-5 text-base font-medium text-[var(--color-slate)] hover:bg-[var(--color-warm-cream)]"
            >
              Go Back
            </Link>
            <Link
              href={`/?pilot_ack_declined=1`}
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
