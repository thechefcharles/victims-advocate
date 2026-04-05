"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { exitSafelyImmediate } from "@/lib/client/safety/exitSafelyImmediate";
import { getPrivacyPolicyEmail } from "@/lib/legal/platformLegalConfig";
import { supabase } from "@/lib/supabaseClient";

type Step = 1 | 2 | 3;
type Choice = "standard" | "safety" | null;

export default function AccountDeleteFlowPage() {
  const router = useRouter();
  const { user, accessToken, deletionRequested, refetchMe } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [choice, setChoice] = useState<Choice>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [completeStandard, setCompleteStandard] = useState(false);
  const [submitLocked, setSubmitLocked] = useState(false);
  const dialogTitleId = useId();
  const privacyEmail = getPrivacyPolicyEmail();

  useEffect(() => {
    if (deletionRequested) {
      router.replace("/account");
    }
  }, [deletionRequested, router]);

  const runSubmit = useCallback(async () => {
    if (!accessToken || !choice) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/account/deletion-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ deletionType: choice }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.message ?? "We could not submit your request. Please try again.");
        return;
      }
      if (choice === "safety") {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }
      await refetchMe();
      setCompleteStandard(true);
    } finally {
      setSubmitting(false);
    }
  }, [accessToken, choice, refetchMe, router]);

  useEffect(() => {
    if (step !== 3 || !choice || completeStandard || submitLocked) return;
    setSubmitLocked(true);
    void runSubmit();
  }, [step, choice, completeStandard, submitLocked, runSubmit]);

  const goStep2 = () => setStep(2);
  const goStep3 = () => {
    if (!choice) return;
    setStep(3);
  };

  return (
    <RequireAuth>
      <main className="relative min-h-screen bg-[var(--color-warm-white)] px-4 pb-24 pt-8 text-[var(--color-navy)] sm:px-6">
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

        <div
          className="mx-auto max-w-lg space-y-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
        >
          {step === 1 ? (
            <>
              <h1 id={dialogTitleId} className="text-2xl font-semibold text-[var(--color-navy)] pr-12">
                Are you sure you want to delete your account?
              </h1>
              <div className="space-y-4 rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/80 p-5 text-[var(--color-charcoal)]">
                <p>This action is permanent and cannot be undone.</p>
                <p>Once your account is deleted, your data cannot be recovered.</p>
                <p className="text-sm leading-relaxed text-[var(--color-slate)]">
                  We will remove your profile, documents, and application data as described in our policy.
                  Some submitted application records may need to be kept for legal reasons — see the{" "}
                  <Link href="/data-deletion" className="font-medium underline hover:text-[var(--color-navy)]">
                    User Data Deletion Policy
                  </Link>{" "}
                  for full details.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 text-base font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-warm-cream)]"
                  onClick={() => router.push("/account")}
                >
                  No, Keep My Account
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--color-slate)] px-5 text-base font-semibold text-white hover:bg-[var(--color-navy)]"
                  onClick={goStep2}
                >
                  Yes, Delete My Account
                </button>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h1 id={dialogTitleId} className="text-2xl font-semibold text-[var(--color-navy)] pr-12">
                Do you need us to delete everything immediately?
              </h1>
              <p className="text-sm text-[var(--color-slate)]">
                You are signed in — we will use this session to verify your request. No extra steps are
                required.
              </p>
              <p className="text-[var(--color-charcoal)]">
                If you are concerned about your safety or need your account removed right away, we can do that
                immediately without any waiting period. Just let us know.
              </p>
              <fieldset className="space-y-3 rounded-2xl border border-[var(--color-border-light)] p-4">
                <legend className="sr-only">Deletion timing</legend>
                <label className="flex min-h-[44px] cursor-pointer gap-3 rounded-lg border border-[var(--color-border-light)] p-3 hover:bg-[var(--color-warm-cream)]">
                  <input
                    type="radio"
                    className="mt-1 h-[1.15rem] w-[1.15rem] shrink-0"
                    name="del-choice"
                    checked={choice === "standard"}
                    onChange={() => setChoice("standard")}
                  />
                  <span>Delete my account — standard process (within 30 days)</span>
                </label>
                <label className="flex min-h-[44px] cursor-pointer gap-3 rounded-lg border border-[var(--color-border-light)] p-3 hover:bg-[var(--color-warm-cream)]">
                  <input
                    type="radio"
                    className="mt-1 h-[1.15rem] w-[1.15rem] shrink-0"
                    name="del-choice"
                    checked={choice === "safety"}
                    onChange={() => setChoice("safety")}
                  />
                  <span>Delete my account immediately — I have a safety concern</span>
                </label>
              </fieldset>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] px-5 text-base font-medium text-[var(--color-slate)] hover:bg-[var(--color-warm-cream)]"
                  onClick={() => router.push("/account")}
                >
                  No, Keep My Account
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--color-teal-deep)] px-5 text-base font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
                  disabled={!choice}
                  onClick={goStep3}
                >
                  Continue
                </button>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h1 id={dialogTitleId} className="text-2xl font-semibold text-[var(--color-navy)] pr-12">
                {choice === "safety" && !completeStandard
                  ? "Processing your request…"
                  : "Your deletion request has been received."}
              </h1>
              {err ? (
                <div className="space-y-3" role="alert">
                  <p className="text-sm text-red-700">{err}</p>
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-slate)] hover:bg-[var(--color-warm-cream)]"
                    onClick={() => {
                      setErr(null);
                      setSubmitLocked(false);
                      setStep(2);
                    }}
                  >
                    Go back and try again
                  </button>
                </div>
              ) : null}
              {choice === "standard" && (submitting || completeStandard) ? (
                <div className="space-y-4 text-[var(--color-charcoal)]">
                  {submitting && !completeStandard ? (
                    <p className="text-sm text-[var(--color-muted)]">Submitting your request…</p>
                  ) : (
                    <>
                      <p>
                        We&apos;ve received your request and will take care of it. We will process your request
                        within 30 days. You will receive a confirmation email when deletion is complete.
                      </p>
                      <p className="text-sm text-[var(--color-slate)]">
                        If any data must be retained for legal reasons, we will explain exactly what and why in
                        that confirmation.
                      </p>
                      <p className="text-sm text-[var(--color-slate)]">
                        You can contact us at{" "}
                        <a className="font-medium underline" href={`mailto:${privacyEmail}`}>
                          {privacyEmail}
                        </a>{" "}
                        if you have any questions.
                      </p>
                      <Link
                        href="/account"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--color-teal-deep)] px-5 text-base font-semibold text-white hover:bg-[var(--color-teal)]"
                      >
                        Back to account
                      </Link>
                    </>
                  )}
                </div>
              ) : null}
              {choice === "safety" && submitting ? (
                <p className="text-sm text-[var(--color-muted)]">Signing you out…</p>
              ) : null}
            </>
          ) : null}
        </div>
      </main>
    </RequireAuth>
  );
}
