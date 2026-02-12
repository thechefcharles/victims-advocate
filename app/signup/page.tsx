"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type AccountType = "victim" | "advocate";

export default function SignupPage() {
  const router = useRouter();

  const [accountType, setAccountType] = useState<AccountType>("victim");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role: accountType,
            organization:
              accountType === "advocate" ? organization.trim() || undefined : undefined,
          },
        },
      });

      if (error) {
        setErr(error.message);
        return;
      }

      if (!data.session) {
        setSuccess(
          "Account created. Please check your email to confirm, then sign in."
        );
        return;
      }

      router.push("/coming-soon");
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
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType("victim")}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                    accountType === "victim"
                      ? "border-[#1C8C8C] bg-[#1C8C8C]/20 text-slate-50"
                      : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
                >
                  I am a victim
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("advocate")}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                    accountType === "advocate"
                      ? "border-[#1C8C8C] bg-[#1C8C8C]/20 text-slate-50"
                      : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
                >
                  I am a victim advocate
                </button>
              </div>
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
              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">Organization (optional)</span>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1C8C8C] focus:border-transparent"
                  placeholder="e.g. Chicago Victim Support"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  type="text"
                />
              </label>
            )}

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
              disabled={loading || !email.trim() || password.length < 8}
              type="submit"
            >
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>

          <p className="text-xs text-slate-500">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-slate-300">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-slate-300">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

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
