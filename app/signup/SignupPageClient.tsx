"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { logAuthEvent } from "@/lib/auditClient";
import { ProgramCatalogSelect } from "@/components/programs/ProgramCatalogSelect";
import { useI18n } from "@/components/i18n/i18nProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { PublicBottomCta } from "@/components/public/PublicBottomCta";

export type SignupAccountType = "victim" | "advocate" | "organization";

type Props = {
  initialAccountType: SignupAccountType;
};

export function SignupPageClient({ initialAccountType }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const { refetchMe } = useAuth();

  const [accountType, setAccountType] = useState<SignupAccountType>(initialAccountType);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  /** Advocate: optional affiliated program in the directory. */
  const [advocateCatalogId, setAdvocateCatalogId] = useState<number | null>(null);
  /** Advocate: optional job title */
  const [jobTitle, setJobTitle] = useState("");
  /** Organization Leader: optional org name hint for later setup (not an org record). */
  const [orgNameHint, setOrgNameHint] = useState("");
  /** Organization Leader: optional title at organization */
  const [orgLeaderTitle, setOrgLeaderTitle] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeWaiver, setAgreeWaiver] = useState(false);
  const [agreePrototype, setAgreePrototype] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (!trimmedFirst || !trimmedLast) {
        setErr("Please enter your first and last name.");
        return;
      }

      const meta: Record<string, unknown> = {
        role: accountType,
        given_name: trimmedFirst,
        family_name: trimmedLast,
      };

      if (accountType === "advocate") {
        if (jobTitle.trim()) meta.advocate_job_title = jobTitle.trim();
        if (advocateCatalogId != null) {
          meta.affiliated_catalog_entry_id = advocateCatalogId;
        }
      }

      if (accountType === "organization") {
        if (orgNameHint.trim()) meta.org_onboarding_display_name_hint = orgNameHint.trim();
        if (orgLeaderTitle.trim()) meta.org_onboarding_leader_title = orgLeaderTitle.trim();
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: meta,
        },
      });

      if (error) {
        setErr(error.message);
        return;
      }

      if (!data.session) {
        setSuccess(
          accountType === "organization"
            ? "Account created. Please check your email to confirm your work email, then sign in. After that you can find or set up your organization."
            : "Account created. Please check your email to confirm, then sign in."
        );
        return;
      }

      await logAuthEvent("auth.signup", data.session.access_token);

      await fetch("/api/me/sync-profile-role", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });

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

      if (accountType === "victim") {
        try {
          const display = `${trimmedFirst} ${trimmedLast}`.trim();
          const pr = await fetch("/api/me/personal-info", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({
              legal_first_name: trimmedFirst,
              legal_last_name: trimmedLast,
              preferred_name: display,
            }),
          });
          if (pr.ok) {
            await refetchMe();
          }
        } catch {
          // Name remains in user_metadata; AuthProvider syncs on next sign-in
        }
      }

      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const nameOk = Boolean(trimmedFirst && trimmedLast);
  const submitDisabled =
    loading ||
    !email.trim() ||
    password.length < 8 ||
    !agreeTerms ||
    !agreeWaiver ||
    !agreePrototype ||
    !nameOk;

  const accountHint =
    accountType === "victim"
      ? t("signup.hintApplicant")
      : accountType === "advocate"
        ? t("signup.hintAdvocate")
        : t("signup.hintOrganization");

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Link
            href="/"
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-charcoal)] inline-block mb-4"
          >
            {t("signup.backHome")}
          </Link>
          <PageHeader
            eyebrow={t("signup.pageEyebrow")}
            title={t("signup.pageTitle")}
            subtitle={t("signup.pageSubtitle")}
          />
        </div>

        <section className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/75 px-4 py-3 text-sm text-[var(--color-slate)]">
          <p>
            <strong className="text-[var(--color-charcoal)]">If you&apos;re in immediate danger,</strong> call{" "}
            <a href="tel:911" className="text-teal-400 hover:underline">
              911
            </a>
            . If you need someone to talk with right now, call or text{" "}
            <a href="tel:988" className="text-[#FF9B9B] font-medium hover:underline">
              988
            </a>{" "}
            (Suicide &amp; Crisis Lifeline).
          </p>
        </section>

        <section aria-label={t("signup.accountTypeLabel")}>
          <h2 className="text-sm font-semibold text-[var(--color-charcoal)] mb-3">{t("signup.accountTypeLabel")}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setAccountType("victim")}
              className={`rounded-xl border border-[var(--color-border)] bg-white p-4 text-left text-sm transition hover:border-[var(--color-teal)]/50 hover:bg-[var(--color-light-sand)]/40 ${
                accountType === "victim" ? "ring-2 ring-[var(--color-teal)]/40 border-[var(--color-teal)]" : ""
              }`}
            >
              <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">{t("signup.typeApplicant")}</p>
              <p className="text-[var(--color-charcoal)] font-medium leading-snug">{t("signup.hintApplicant")}</p>
            </button>
            <button
              type="button"
              onClick={() => setAccountType("advocate")}
              className={`rounded-xl border border-[var(--color-border)] bg-white p-4 text-left text-sm transition hover:border-[var(--color-teal)]/50 hover:bg-[var(--color-light-sand)]/40 ${
                accountType === "advocate" ? "ring-2 ring-[var(--color-teal)]/40 border-[var(--color-teal)]" : ""
              }`}
            >
              <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">{t("signup.typeAdvocate")}</p>
              <p className="text-[var(--color-charcoal)] font-medium leading-snug">{t("signup.hintAdvocate")}</p>
            </button>
            <button
              type="button"
              onClick={() => setAccountType("organization")}
              className={`rounded-xl border border-[var(--color-border)] bg-white p-4 text-left text-sm transition hover:border-[var(--color-teal)]/50 hover:bg-[var(--color-light-sand)]/40 ${
                accountType === "organization" ? "ring-2 ring-[var(--color-teal)]/40 border-[var(--color-teal)]" : ""
              }`}
            >
              <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">{t("signup.typeOrganization")}</p>
              <p className="text-[var(--color-charcoal)] font-medium leading-snug">{t("signup.hintOrganization")}</p>
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 space-y-5 shadow-sm shadow-black/25">
          <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">{accountHint}</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-[11px] text-[var(--color-muted)]">First name *</span>
                <input
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-white)] px-3 py-2.5 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] focus:border-transparent"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                  maxLength={200}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-[var(--color-muted)]">Last name *</span>
                <input
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-white)] px-3 py-2.5 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] focus:border-transparent"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                  maxLength={200}
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-[11px] text-[var(--color-muted)]">
                {accountType === "organization" ? "Work email *" : "Email *"}
              </span>
              <input
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-white)] px-3 py-2.5 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] focus:border-transparent"
                placeholder={accountType === "organization" ? "you@agency.org" : "you@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                type="email"
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] text-[var(--color-muted)]">Password *</span>
              <input
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-white)] px-3 py-2.5 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] focus:border-transparent"
                placeholder="At least 8 characters"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </label>

            {accountType === "advocate" && (
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-[11px] text-[var(--color-muted)]">Job title (optional)</span>
                  <input
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-white)] px-3 py-2.5 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] focus:border-transparent"
                    placeholder="e.g. Advocate or coordinator"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    type="text"
                    maxLength={200}
                  />
                </label>
                <ProgramCatalogSelect
                  id="advocate-program"
                  label="Your affiliated Illinois program (optional)"
                  required={false}
                  value={advocateCatalogId}
                  onChange={(id) => setAdvocateCatalogId(id)}
                />
              </div>
            )}

            {accountType === "organization" && (
              <div className="space-y-3 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/70 p-3">
                <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
                  Optional details help us prefill organization setup later. They do not create an organization record.
                </p>
                <label className="block space-y-1">
                  <span className="text-[11px] text-[var(--color-muted)]">Organization name (optional)</span>
                  <input
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-white)] px-3 py-2.5 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] focus:border-transparent"
                    placeholder="Agency or program name (for context only)"
                    value={orgNameHint}
                    onChange={(e) => setOrgNameHint(e.target.value)}
                    type="text"
                    maxLength={300}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-[var(--color-muted)]">Your title at the organization (optional)</span>
                  <input
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-white)] px-3 py-2.5 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] focus:border-transparent"
                    placeholder="e.g. Executive director"
                    value={orgLeaderTitle}
                    onChange={(e) => setOrgLeaderTitle(e.target.value)}
                    type="text"
                    maxLength={200}
                  />
                </label>
              </div>
            )}

            {accountType === "victim" && (
              <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
                {t("signup.preferredNameHelp")}
              </p>
            )}

            <fieldset className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/70 p-3">
              <legend className="text-[11px] text-[var(--color-muted)]">
                Required agreements (must check all to continue)
              </legend>
              <label className="flex items-start gap-3 text-sm cursor-pointer">
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
              <label className="flex items-start gap-3 text-sm cursor-pointer">
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
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreePrototype}
                  onChange={(e) => setAgreePrototype(e.target.checked)}
                  className="mt-0.5 rounded border-[var(--color-border)] bg-white text-emerald-500 focus:ring-emerald-400"
                />
                <span>
                  I understand this is a prototype and NxtStps is not liable for the security or handling of my
                  information at this stage.
                </span>
              </label>
            </fieldset>

            {err && (
              <div className="text-sm text-red-300 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
                {err}
              </div>
            )}
            {success && (
              <div className="text-sm text-emerald-200 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-3 py-2">
                {success}
              </div>
            )}

            <button
              className="w-full rounded-lg bg-[var(--color-teal-deep)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50 disabled:cursor-not-allowed transition"
              disabled={submitDisabled}
              type="submit"
            >
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>

          <p className="text-xs text-[var(--color-muted)] pt-1">
            Also see our{" "}
            <Link href="/privacy" className="underline hover:text-[var(--color-slate)]">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/waiver" className="underline hover:text-[var(--color-slate)]">
              Liability Waiver
            </Link>
            .
          </p>
        </section>

        <p className="text-center text-sm text-[var(--color-muted)]">
          {t("signup.orgSignupBefore")}{" "}
          <Link href="/signup?intent=organization" className="underline hover:text-[var(--color-charcoal)]">
            {t("signup.typeOrganization")}
          </Link>{" "}
          {t("signup.orgSignupAfter")}
        </p>

        <p className="text-center text-sm text-[var(--color-muted)]">
          {t("signup.signInPrompt")}{" "}
          <Link href="/login" className="underline hover:text-[var(--color-charcoal)]">
            {t("signup.signInLink")}
          </Link>
        </p>

        <PublicBottomCta />
      </div>
    </main>
  );
}
