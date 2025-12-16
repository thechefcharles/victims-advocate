// components/auth/SignupForm.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdvocateSignupForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-4 py-10">
      <form
        onSubmit={onSubmit}
        className="max-w-md mx-auto rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4"
      >
        <header className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
            Victim advocate account
          </p>
          <h1 className="text-2xl font-semibold">Create your advocate account</h1>
          <p className="text-[11px] text-slate-400">
            Use the same email your clients will invite.
          </p>
        </header>

        <label className="block space-y-1">
          <span className="text-[11px] text-slate-400">Work email</span>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
            placeholder="advocate@agency.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            type="email"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] text-slate-400">Password</span>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
            placeholder="Minimum 8 characters"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>

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
          className="w-full rounded-lg bg-[#1C8C8C] px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-[#21a3a3] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !email.trim() || password.length < 8}
          type="submit"
        >
          {loading ? "Creating…" : "Create advocate account"}
        </button>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <Link href="/login" className="underline underline-offset-2 hover:text-slate-200">
            Already have an account?
          </Link>

          <Link href="/signup" className="underline underline-offset-2 hover:text-slate-200">
            I’m a victim/survivor
          </Link>
        </div>

        <p className="text-[11px] text-slate-500">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-slate-300">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-slate-300">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </main>
  );
}