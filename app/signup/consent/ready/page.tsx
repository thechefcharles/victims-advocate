"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { exitSafelyImmediate } from "@/lib/client/safety/exitSafelyImmediate";
import {
  CURRENT_LIABILITY_WAIVER_VERSION,
  CURRENT_PILOT_ACK_VERSION,
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
  getPlatformStatus,
} from "@/lib/legal/platformLegalConfig";

/**
 * Transition after the final consent step (waiver in production, pilot ack in pilot/MVP).
 */
export default function SignupConsentReadyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken, loading: authLoading } = useAuth();
  const [gateOk, setGateOk] = useState(false);

  const redirectToRaw = searchParams.get("redirect")?.trim() || "/dashboard";
  const redirectTo = redirectToRaw.startsWith("/") ? redirectToRaw : "/dashboard";
  const redirectQuery = `redirect=${encodeURIComponent(redirectTo)}`;

  useEffect(() => {
    if (authLoading) return;
    if (!user || !accessToken) {
      router.replace(`/login?returnTo=${encodeURIComponent("/signup/consent/ready")}`);
      return;
    }
    const platformStatus = getPlatformStatus();
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
      const termsOk =
        d.termsVersionAccepted === CURRENT_TERMS_VERSION &&
        typeof d.termsAcceptedAt === "string" &&
        (d.termsAcceptedAt as string).length > 0;
      const privacyOk =
        d.privacyPolicyVersionAccepted === CURRENT_PRIVACY_POLICY_VERSION &&
        typeof d.privacyPolicyAcceptedAt === "string" &&
        (d.privacyPolicyAcceptedAt as string).length > 0;
      const waiverOk =
        d.liabilityWaiverVersionAccepted === CURRENT_LIABILITY_WAIVER_VERSION &&
        typeof d.liabilityWaiverAcceptedAt === "string" &&
        (d.liabilityWaiverAcceptedAt as string).length > 0;
      const pilotOk =
        platformStatus === "production" ||
        (d.pilotAckVersionAccepted === CURRENT_PILOT_ACK_VERSION &&
          typeof d.pilotAckAcceptedAt === "string" &&
          (d.pilotAckAcceptedAt as string).length > 0);

      const next = d.legalConsentNextPath;
      if (!termsOk) {
        router.replace(`/signup/consent/terms?${redirectQuery}`);
        return;
      }
      if (!privacyOk) {
        router.replace(`/signup/consent/privacy?${redirectQuery}`);
        return;
      }
      if (!waiverOk) {
        router.replace(`/signup/consent/waiver?${redirectQuery}`);
        return;
      }
      if (!pilotOk) {
        router.replace(`/signup/consent/beta?${redirectQuery}`);
        return;
      }
      if (typeof next === "string" && next.length > 0) {
        router.replace(`${next}?${redirectQuery}`);
        return;
      }
      if (!cancelled) setGateOk(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, accessToken, router, redirectQuery]);

  if (authLoading || !user || !gateOk) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] px-6 py-10 text-[var(--color-navy)]">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[var(--color-warm-white)] px-4 pb-16 pt-6 text-[var(--color-navy)] sm:px-6">
      <div className="pointer-events-auto fixed right-4 top-4 z-50 sm:right-6 sm:top-5">
        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-medium text-[var(--color-slate)] hover:bg-[var(--color-surface)] hover:text-[var(--color-charcoal)]"
          onClick={() =>
            exitSafelyImmediate({ userId: user?.id ?? null, accessToken: accessToken ?? null })
          }
          aria-label="Exit platform immediately and safely"
        >
          Exit Safely
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      </div>

      <div className="mx-auto max-w-lg space-y-6 pt-8 text-center sm:pt-12">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] sm:text-3xl">
          You&apos;re ready to begin.
        </h1>
        <p className="text-lg text-[var(--color-slate)]">Let us help you take the next step.</p>
        <Link
          href={redirectTo}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[var(--color-teal-deep)] px-6 text-base font-semibold text-white hover:bg-[var(--color-teal)]"
          aria-label="Create My Account"
        >
          Create My Account
        </Link>
      </div>
    </main>
  );
}
