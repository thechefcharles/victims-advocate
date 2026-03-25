"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { logAuthEvent } from "@/lib/auditClient";
import { ProgramCatalogSelect } from "@/components/programs/ProgramCatalogSelect";
import { useI18n } from "@/components/i18n/i18nProvider";
import { useAuth } from "@/components/auth/AuthProvider";

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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-12">
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm">
            ← Back to home
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 sm:p-8 space-y-6">
          <header>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-1">NxtStps</p>
            <h1 className="text-2xl font-semibold text-slate-50">Create your account</h1>
            <p className="text-sm text-slate-400 mt-2">
              Create your personal account first. If you lead an organization, you&apos;ll find or set up that
              organization after you sign in—we don&apos;t create it during this step.
            </p>
          </header>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <span className="text-[11px] text-slate-400 block">Account type *</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType("victim")}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    accountType === "victim"
                      ? "border-blue-500 bg-blue-600/20 text-slate-50"
                      : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
                >
                  Victim
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("advocate")}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    accountType === "advocate"
                      ? "border-blue-500 bg-blue-600/20 text-slate-50"
                      : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
                >
                  Advocate
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("organization")}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition leading-snug ${
                    accountType === "organization"
                      ? "border-blue-500 bg-blue-600/20 text-slate-50"
                      : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
                >
                  Organization Leader
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                {accountType === "victim" && "Personal tools and compensation guidance for victims."}
                {accountType === "advocate" && "Case tools for victim advocates."}
                {accountType === "organization" &&
                  "For people who represent an agency. You&apos;ll link or propose your organization after email verification and agreements—not during signup."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">First name *</span>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                  maxLength={200}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">Last name *</span>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <span className="text-[11px] text-slate-400">
                {accountType === "organization" ? "Work email *" : "Email *"}
              </span>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={accountType === "organization" ? "you@agency.org" : "you@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                type="email"
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] text-slate-400">Password *</span>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <span className="text-[11px] text-slate-400">Job title (optional)</span>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Victim advocate"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    type="text"
                    maxLength={200}
                  />
                </label>
                <ProgramCatalogSelect
                  id="advocate-program"
                  label="Your Illinois victim assistance program (optional)"
                  required={false}
                  value={advocateCatalogId}
                  onChange={(id) => setAdvocateCatalogId(id)}
                />
              </div>
            )}

            {accountType === "organization" && (
              <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Optional details help us prefill organization setup later. They do not create an organization record.
                </p>
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-400">Organization name (optional)</span>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Agency or program name (for context only)"
                    value={orgNameHint}
                    onChange={(e) => setOrgNameHint(e.target.value)}
                    type="text"
                    maxLength={300}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-400">Your title at the organization (optional)</span>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {t("signup.preferredNameHelp")}
              </p>
            )}

            <fieldset className="space-y-3 rounded-lg border border-slate-700 bg-slate-950/40 p-3">
              <legend className="text-[11px] text-slate-400">
                Required agreements (must check all to continue)
              </legend>
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
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
                  className="mt-0.5 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
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
                  className="mt-0.5 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
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
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              disabled={submitDisabled}
              type="submit"
            >
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>

          <p className="text-xs text-slate-500">
            Also see our{" "}
            <Link href="/privacy" className="underline hover:text-slate-300">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/waiver" className="underline hover:text-slate-300">
              Liability Waiver
            </Link>
            .
          </p>
        </div>

        <p className="text-center text-sm text-slate-400">
          Represent an organization? Choose{" "}
          <Link href="/signup?intent=organization" className="underline hover:text-slate-200">
            Organization Leader
          </Link>{" "}
          above—you&apos;ll complete organization steps after you sign in.
        </p>

        <p className="text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="underline hover:text-slate-200">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
