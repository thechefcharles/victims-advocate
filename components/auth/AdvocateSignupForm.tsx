// components/auth/SignupForm.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { logAuthEvent } from "@/lib/auditClient";
import { validatePassword } from "@/lib/passwordPolicy";

export default function AdvocateSignupForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeWaiver, setAgreeWaiver] = useState(false);
  const [agreePrototype, setAgreePrototype] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const passwordValidation = validatePassword(password);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    setPasswordErrors([]);
    const pv = validatePassword(password);
    if (!pv.valid) {
      setPasswordErrors(pv.errors);
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { role: "advocate" }, // ✅ used by your handle_new_user() trigger
        },
      });

      if (error) {
        setErr(error.message);
        return;
      }

      if (!data.session) {
        setSuccess("Account created. Please check your email to confirm, then log in.");
        return;
      }

      await logAuthEvent("auth.signup", data.session.access_token);

      try {
        const activeRes = await fetch("/api/policies/active", {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        if (activeRes.ok) {
          const activeJson = await activeRes.json();
          const policies = (activeJson.data?.policies ?? []) as { id: string; doc_type: string }[];
          const toAccept = policies
            .filter((p) => p.doc_type === "terms_of_use" || p.doc_type === "privacy_policy")
            .map((p) => p.id);
          if (toAccept.length > 0) {
            await fetch("/api/policies/accept", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.session.access_token}`,
              },
              body: JSON.stringify({ policy_ids: toAccept }),
            });
          }
        }
      } catch {
        // Non-blocking
      }

      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 py-10">
      <form
        onSubmit={onSubmit}
        className="max-w-md mx-auto rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 p-6 space-y-4"
      >
        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
            Victim advocate account
          </p>
          <h1 className="text-2xl font-semibold">Create your advocate account</h1>
          <p className="text-[11px] text-[var(--color-muted)]">
            Use the same email your clients will invite.
          </p>
        </header>

        <label className="block space-y-1">
          <span className="text-[11px] text-[var(--color-muted)]">Work email</span>
          <input
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2 text-xs text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
            placeholder="advocate@agency.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            type="email"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] text-[var(--color-muted)]">Password</span>
          <input
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2 text-xs text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
            placeholder="At least 12 characters; 3 of: lowercase, uppercase, number, symbol"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          {passwordValidation.errors.length > 0 && (
            <ul className="text-[11px] text-amber-300 list-disc list-inside">
              {passwordValidation.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </label>

        <fieldset className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/70 p-3">
          <legend className="text-[11px] text-[var(--color-muted)]">
            Required agreements (must check all to continue)
          </legend>
          <label className="flex items-start gap-3 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 rounded border-[var(--color-border)] bg-white text-emerald-500 focus:ring-emerald-400"
            />
            <span>
              I have read and agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-emerald-400"
              >
                Terms of Use
              </Link>
            </span>
          </label>
          <label className="flex items-start gap-3 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={agreeWaiver}
              onChange={(e) => setAgreeWaiver(e.target.checked)}
              className="mt-0.5 rounded border-[var(--color-border)] bg-white text-emerald-500 focus:ring-emerald-400"
            />
            <span>
              I have read and agree to the{" "}
              <Link
                href="/waiver"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-emerald-400"
              >
                Liability Waiver & Release of Claims
              </Link>
            </span>
          </label>
          <label className="flex items-start gap-3 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={agreePrototype}
              onChange={(e) => setAgreePrototype(e.target.checked)}
              className="mt-0.5 rounded border-[var(--color-border)] bg-white text-emerald-500 focus:ring-emerald-400"
            />
            <span>
              I understand this is a prototype and NxtStps is not liable for the
              security or handling of my information at this stage.
            </span>
          </label>
        </fieldset>

        {err && (
          <div className="text-[11px] text-red-300 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
            {err}
          </div>
        )}
        {success && (
          <div className="text-[11px] text-emerald-200 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-3 py-2">
            {success}
          </div>
        )}

        <button
          className="w-full rounded-lg bg-[var(--color-teal-deep)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !email.trim() || !passwordValidation.valid || !agreeTerms || !agreeWaiver || !agreePrototype}
          type="submit"
        >
          {loading ? "Creating…" : "Create advocate account"}
        </button>

        <div className="flex items-center justify-between text-[11px] text-[var(--color-muted)]">
          <Link href="/login" className="underline underline-offset-2 hover:text-[var(--color-charcoal)]">
            Already have an account?
          </Link>

          <Link href="/signup" className="underline underline-offset-2 hover:text-[var(--color-charcoal)]">
            I’m an applicant
          </Link>
        </div>

        <p className="text-[11px] text-[var(--color-muted)]">
          Also see our{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--color-slate)]">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </main>
  );
}