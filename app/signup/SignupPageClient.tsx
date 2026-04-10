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

/**
 * The 2.0 signup model: Applicant or Provider.
 * Provider sub-types (advocate vs org leader) determine the legacy
 * ProfileRole written to user_metadata so resolveAccountType() works.
 * Agency accounts are platform-admin provisioned — no self-signup.
 */
export type SignupAccountType = "victim" | "advocate" | "organization";
type TopLevelChoice = "applicant" | "provider";
type ProviderSubType = "advocate" | "organization";

type Props = {
  initialAccountType: SignupAccountType;
};

function toTopLevel(t: SignupAccountType): TopLevelChoice {
  return t === "victim" ? "applicant" : "provider";
}

function toProviderSub(t: SignupAccountType): ProviderSubType {
  return t === "organization" ? "organization" : "advocate";
}

export function SignupPageClient({ initialAccountType }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const { refetchMe } = useAuth();

  const [topLevel, setTopLevel] = useState<TopLevelChoice>(toTopLevel(initialAccountType));
  const [providerSub, setProviderSub] = useState<ProviderSubType>(toProviderSub(initialAccountType));

  // Derive the legacy role value for Supabase user_metadata
  const accountType: SignupAccountType =
    topLevel === "applicant" ? "victim" : providerSub;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [advocateCatalogId, setAdvocateCatalogId] = useState<number | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [orgNameHint, setOrgNameHint] = useState("");
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
        if (advocateCatalogId != null) meta.affiliated_catalog_entry_id = advocateCatalogId;
      }

      if (accountType === "organization") {
        if (orgNameHint.trim()) meta.org_onboarding_display_name_hint = orgNameHint.trim();
        if (orgLeaderTitle.trim()) meta.org_onboarding_leader_title = orgLeaderTitle.trim();
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: meta },
      });

      if (error) { setErr(error.message); return; }

      if (!data.session) {
        setSuccess(
          accountType === "organization"
            ? "Account created. Please check your email to confirm your work email, then sign in. After that you can find or set up your organization."
            : "Account created. Please check your email to confirm, then sign in.",
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
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
              body: JSON.stringify({ policy_ids: toAccept }),
            });
          }
        }
      } catch { /* Non-blocking */ }

      if (accountType === "victim") {
        try {
          const display = `${trimmedFirst} ${trimmedLast}`.trim();
          const pr = await fetch("/api/me/personal-info", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
            body: JSON.stringify({ legal_first_name: trimmedFirst, legal_last_name: trimmedLast, preferred_name: display }),
          });
          if (pr.ok) await refetchMe();
        } catch { /* Name remains in user_metadata */ }
      }

      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const nameOk = Boolean(trimmedFirst && trimmedLast);
  const submitDisabled = loading || !email.trim() || password.length < 8 || !agreeTerms || !agreeWaiver || !agreePrototype || !nameOk;

  const inputClass = "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-white)] px-3 py-2.5 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] focus:border-transparent";
  const cardClass = (active: boolean) =>
    `rounded-xl border border-[var(--color-border)] bg-white p-4 text-left text-sm transition hover:border-[var(--color-teal)]/50 hover:bg-[var(--color-light-sand)]/40 ${active ? "ring-2 ring-[var(--color-teal)]/40 border-[var(--color-teal)]" : ""}`;

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Link href="/" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-charcoal)] inline-block mb-4">
            ← Back to home
          </Link>
          <PageHeader eyebrow="Get started" title="Create your account" subtitle="Choose your account type to get started." />
        </div>

        {/* Crisis banner */}
        <section className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/75 px-4 py-3 text-sm text-[var(--color-slate)]">
          <p>
            <strong className="text-[var(--color-charcoal)]">If you&apos;re in immediate danger,</strong> call{" "}
            <a href="tel:911" className="text-teal-400 hover:underline">911</a>. If you need someone to talk with right now, call or text{" "}
            <a href="tel:988" className="text-[#FF9B9B] font-medium hover:underline">988</a> (Suicide &amp; Crisis Lifeline).
          </p>
        </section>

        {/* Account type selection — 2 primary choices */}
        <section aria-label="Choose your account type">
          <h2 className="text-sm font-semibold text-[var(--color-charcoal)] mb-3">I am...</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setTopLevel("applicant")} className={cardClass(topLevel === "applicant")}>
              <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">Applicant</p>
              <p className="text-[var(--color-charcoal)] font-medium leading-snug">I need help finding services, filing for compensation, or getting support.</p>
            </button>
            <button type="button" onClick={() => setTopLevel("provider")} className={cardClass(topLevel === "provider")}>
              <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">Provider</p>
              <p className="text-[var(--color-charcoal)] font-medium leading-snug">I work at an organization that serves victims — as an advocate, coordinator, or leader.</p>
            </button>
          </div>

          {/* Agency note */}
          <p className="text-[11px] text-[var(--color-muted)] mt-3">
            Administering Agency accounts are set up by NxtStps.{" "}
            <a href="mailto:support@nxtstps.com" className="underline hover:text-[var(--color-charcoal)]">Contact us</a> for agency access.
          </p>
        </section>

        {/* Provider sub-type selector */}
        {topLevel === "provider" && (
          <section aria-label="Provider role">
            <h2 className="text-sm font-semibold text-[var(--color-charcoal)] mb-3">My role</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setProviderSub("advocate")} className={cardClass(providerSub === "advocate")}>
                <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">Advocate / Staff</p>
                <p className="text-[var(--color-charcoal)] font-medium leading-snug">I work directly with people who need help — as an advocate, case manager, or coordinator.</p>
              </button>
              <button type="button" onClick={() => setProviderSub("organization")} className={cardClass(providerSub === "organization")}>
                <p className="text-xs font-semibold text-[var(--color-muted)] mb-1">Organization Leader</p>
                <p className="text-[var(--color-charcoal)] font-medium leading-snug">I manage or lead a service organization and want to set it up on NxtStps.</p>
              </button>
            </div>
          </section>
        )}

        {/* Form */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 space-y-5 shadow-sm shadow-black/25">
          <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
            {topLevel === "applicant"
              ? "Your information is private. We use it only to help you access services and support."
              : providerSub === "advocate"
                ? "Create your advocate account. You can join an organization after signing up."
                : "Create your account. You'll set up your organization in the next step."}
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-[11px] text-[var(--color-muted)]">First name *</span>
                <input className={inputClass} placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" required maxLength={200} />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-[var(--color-muted)]">Last name *</span>
                <input className={inputClass} placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" required maxLength={200} />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-[11px] text-[var(--color-muted)]">{accountType === "organization" ? "Work email *" : "Email *"}</span>
              <input className={inputClass} placeholder={accountType === "organization" ? "you@organization.org" : "you@example.com"} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" type="email" required />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] text-[var(--color-muted)]">Password *</span>
              <input className={inputClass} placeholder="At least 8 characters" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
            </label>

            {/* Provider sub-fields */}
            {topLevel === "provider" && providerSub === "advocate" && (
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-[11px] text-[var(--color-muted)]">Job title (optional)</span>
                  <input className={inputClass} placeholder="e.g. Victim advocate or case manager" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} type="text" maxLength={200} />
                </label>
                <ProgramCatalogSelect id="advocate-program" label="Your affiliated Illinois program (optional)" required={false} value={advocateCatalogId} onChange={(id) => setAdvocateCatalogId(id)} />
              </div>
            )}

            {topLevel === "provider" && providerSub === "organization" && (
              <div className="space-y-3 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/70 p-3">
                <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">Optional — helps us prefill your organization setup later.</p>
                <label className="block space-y-1">
                  <span className="text-[11px] text-[var(--color-muted)]">Organization name (optional)</span>
                  <input className={inputClass} placeholder="Your organization's name" value={orgNameHint} onChange={(e) => setOrgNameHint(e.target.value)} type="text" maxLength={300} />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-[var(--color-muted)]">Your title (optional)</span>
                  <input className={inputClass} placeholder="e.g. Executive director" value={orgLeaderTitle} onChange={(e) => setOrgLeaderTitle(e.target.value)} type="text" maxLength={200} />
                </label>
              </div>
            )}

            {topLevel === "applicant" && (
              <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
                Your preferred name is how we&apos;ll address you. You can change it anytime in settings.
              </p>
            )}

            {/* Agreements */}
            <fieldset className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/70 p-3">
              <legend className="text-[11px] text-[var(--color-muted)]">Required agreements</legend>
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-0.5 rounded border-[var(--color-border)] bg-white text-emerald-500 focus:ring-emerald-400" />
                <span>I have read and agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-emerald-400">Terms of Use</Link></span>
              </label>
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input type="checkbox" checked={agreeWaiver} onChange={(e) => setAgreeWaiver(e.target.checked)} className="mt-0.5 rounded border-[var(--color-border)] bg-white text-emerald-500 focus:ring-emerald-400" />
                <span>I have read and agree to the <Link href="/waiver" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-emerald-400">Liability Waiver</Link></span>
              </label>
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input type="checkbox" checked={agreePrototype} onChange={(e) => setAgreePrototype(e.target.checked)} className="mt-0.5 rounded border-[var(--color-border)] bg-white text-emerald-500 focus:ring-emerald-400" />
                <span>I understand this is a prototype and my information may not be fully secured at this stage.</span>
              </label>
            </fieldset>

            {err && <div className="text-sm text-red-300 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">{err}</div>}
            {success && <div className="text-sm text-emerald-200 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-3 py-2">{success}</div>}

            <button className="w-full rounded-lg bg-[var(--color-teal-deep)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50 disabled:cursor-not-allowed transition" disabled={submitDisabled} type="submit">
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>

          <p className="text-xs text-[var(--color-muted)] pt-1">
            Also see our <Link href="/privacy" className="underline hover:text-[var(--color-slate)]">Privacy Policy</Link> and <Link href="/waiver" className="underline hover:text-[var(--color-slate)]">Liability Waiver</Link>.
          </p>
        </section>

        <p className="text-center text-sm text-[var(--color-muted)]">
          Already have an account?{" "}
          <Link href="/login" className="underline hover:text-[var(--color-charcoal)]">Sign in</Link>
        </p>

        <PublicBottomCta />
      </div>
    </main>
  );
}
