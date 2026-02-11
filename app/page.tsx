"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function HomePage() {
  const { loading, user, isAdmin } = useAuth();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!email) return;

    setNewsletterStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "homepage" }),
      });

      if (res.ok) {
        setNewsletterStatus("success");
        setNewsletterEmail("");
      } else {
        setNewsletterStatus("error");
      }
    } catch {
      setNewsletterStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-20 space-y-20">
        {/* Hero */}
        <section className="text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-50">
            Trauma-informed support for crime victims
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-300">
            NxtStps helps victims and advocates navigate government programs—starting
            with Illinois Crime Victims Compensation. Plain language, step-by-step,
            available in English and Spanish.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-[#1C8C8C] px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-[#21a3a3] transition"
            >
              Create account
            </Link>
            {loading ? (
              <span className="text-sm text-slate-400">Loading…</span>
            ) : user ? (
              isAdmin ? (
                <Link
                  href="/compensation"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-600 px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800/60 transition"
                >
                  Go to MVP →
                </Link>
              ) : (
                <Link
                  href="/coming-soon"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-600 px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800/60 transition"
                >
                  My account
                </Link>
              )
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-slate-600 px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800/60 transition"
              >
                Sign in
              </Link>
            )}
          </div>
        </section>

        {/* Newsletter signup */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 sm:p-8 max-w-xl mx-auto">
          <h2 className="text-lg font-semibold text-slate-50 mb-2">
            Get our weekly newsletter
          </h2>
          <p className="text-sm text-slate-300 mb-4">
            Updates on NxtStps, victim resources, and gov tech.
          </p>
          <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1C8C8C] focus:border-transparent"
              disabled={newsletterStatus === "loading"}
            />
            <button
              type="submit"
              disabled={newsletterStatus === "loading"}
              className="rounded-lg bg-[#1C8C8C] px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#21a3a3] disabled:opacity-50 transition"
            >
              {newsletterStatus === "loading"
                ? "…"
                : newsletterStatus === "success"
                  ? "Done"
                  : "Subscribe"}
            </button>
          </form>
          {newsletterStatus === "success" && (
            <p className="mt-2 text-sm text-emerald-400">Thanks for subscribing.</p>
          )}
          {newsletterStatus === "error" && (
            <p className="mt-2 text-sm text-red-400">Something went wrong. Try again.</p>
          )}
        </section>

        {/* What is NxtStps */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-50">What is NxtStps?</h2>
          <p className="text-slate-300 max-w-2xl">
            NxtStps is a platform that makes government programs—like Crime Victims
            Compensation—easier to understand and apply for. We translate complex forms
            into plain language, guide users step-by-step, and support multiple languages.
            Our goal is to close the gap between victims and the resources they deserve.
          </p>
        </section>

        {/* Gov tech problem */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">
            Why gov tech needs this
          </h2>
          <p className="text-slate-300">
            Government forms and processes are often confusing, English-only, and
            overwhelming—especially for people in crisis. Crime victims face medical
            bills, lost wages, and trauma, yet many never apply for compensation because
            the process is too hard. NxtStps bridges that gap with trauma-informed design,
            multilingual support, and clear guidance.
          </p>
          <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
            <li>Plain-language forms and step-by-step flows</li>
            <li>Spanish and English support from day one</li>
            <li>Trauma-informed UX (pacing, clarity, no unnecessary pressure)</li>
            <li>Built for victims and advocates working together</li>
          </ul>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4">
          <p className="text-slate-300">
            Create an account to get early access when we launch.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl bg-[#1C8C8C] px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-[#21a3a3] transition"
          >
            Create account
          </Link>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#020813] mt-16">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} NxtStps. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-slate-200">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-200">
              Terms
            </Link>
            <a href="tel:988" className="font-semibold text-[#FF7A7A] hover:text-[#ff9c9c]">
              Crisis line: 988
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
