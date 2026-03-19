"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { logAuthEvent } from "@/lib/auditClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { ProgramCatalogSelect } from "@/components/programs/ProgramCatalogSelect";

type AccountType = "victim" | "advocate" | "organization";

export default function SignupPage() {
  const router = useRouter();

  const [accountType, setAccountType] = useState<AccountType>("victim");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  /** Illinois Crime Victim Assistance directory id (organization signup – required). */
  const [orgCatalogId, setOrgCatalogId] = useState<number | null>(null);
  /** Advocate: optional affiliated program in the directory. */
  const [advocateCatalogId, setAdvocateCatalogId] = useState<number | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeWaiver, setAgreeWaiver] = useState(false);
  const [agreePrototype, setAgreePrototype] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (accountType === "organization" && orgCatalogId == null) {
        setErr("Please select your organization from the Illinois victim assistance directory.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role: accountType,
            organization:
              accountType === "advocate" ? organization.trim() || undefined : undefined,
            ...(accountType === "organization" && orgCatalogId != null
              ? { pending_org_catalog_entry_id: orgCatalogId }
              : {}),
            ...(accountType === "advocate" && advocateCatalogId != null
              ? { affiliated_catalog_entry_id: advocateCatalogId }
              : {}),
          },
        },
      });

      if (error) {
        setErr(error.message);
        return;
      }

      if (!data.session) {
        setSuccess(
          accountType === "organization"
            ? "Account created. Please check your email to confirm, then sign in—we’ll create your organization automatically on first sign-in."
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

      if (accountType === "organization" && orgCatalogId != null) {
        const regRes = await fetch("/api/org/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ catalog_entry_id: orgCatalogId }),
        });
        const regJson = await regRes.json().catch(() => ({}));
        if (!regRes.ok) {
          setErr(
            getApiErrorMessage(
              regJson,
              "Could not save your organization yet. Use the form on the next screen to try again."
            )
          );
          router.replace("/organization/setup");
          return;
        }
      }

      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-4 py-12">
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm">
            ← Back to home
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 sm:p-8 space-y-6">
          <header>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-1">
              NxtStps
            </p>
            <h1 className="text-2xl font-semibold text-slate-50">
              Create your account
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              Get early access when we launch. You can opt into our newsletter
              on the next page.
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
                      ? "border-[#1C8C8C] bg-[#1C8C8C]/20 text-slate-50"
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
                      ? "border-[#1C8C8C] bg-[#1C8C8C]/20 text-slate-50"
                      : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
                >
                  Advocate
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("organization")}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    accountType === "organization"
                      ? "border-[#1C8C8C] bg-[#1C8C8C]/20 text-slate-50"
                      : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
                >
                  Organization
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                {accountType === "victim" && "Personal tools and compensation guidance."}
                {accountType === "advocate" && "Case tools for victim advocates."}
                {accountType === "organization" &&
                  "Your agency appears in the platform directory for admins. You’ll manage staff from the org dashboard."}
              </p>
            </div>

            <label className="block space-y-1">
              <span className="text-[11px] text-slate-400">Email *</span>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1C8C8C] focus:border-transparent"
                placeholder="you@example.com"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1C8C8C] focus:border-transparent"
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
                <ProgramCatalogSelect
                  id="advocate-program"
                  label="Your Illinois victim assistance program (optional)"
                  required={false}
                  value={advocateCatalogId}
                  onChange={(id) => setAdvocateCatalogId(id)}
                />
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-400">Notes (optional)</span>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1C8C8C] focus:border-transparent"
                    placeholder="e.g. department or team (not in directory)"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    type="text"
                  />
                </label>
              </div>
            )}

            {accountType === "organization" && (
              <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-400 font-medium">
                  Select the program you represent (Illinois Crime Victim Assistance Services directory)
                </p>
                <ProgramCatalogSelect
                  id="org-program"
                  label="Your program"
                  required
                  value={orgCatalogId}
                  onChange={(id) => setOrgCatalogId(id)}
                />
              </div>
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
                  I understand this is a prototype and NxtStps is not liable for
                  the security or handling of my information at this stage.
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
              className="w-full rounded-lg bg-[#1C8C8C] px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#21a3a3] disabled:opacity-50 disabled:cursor-not-allowed transition"
              disabled={
                loading ||
                !email.trim() ||
                password.length < 8 ||
                !agreeTerms ||
                !agreeWaiver ||
                !agreePrototype ||
                (accountType === "organization" && orgCatalogId == null)
              }
              type="submit"
            >
              {loading ? "Creating…" : accountType === "organization" ? "Create organization account" : "Create account"}
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
          Already have an account and need to add your org?{" "}
          <Link href="/signup/organization" className="underline hover:text-slate-200">
            Register organization
          </Link>
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
