"use client";

import Link from "next/link";
import { useState } from "react";

export default function ComingSoonPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source: "coming-soon" }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full space-y-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-50">
          Coming soon
        </h1>
        <p className="text-slate-300">
          Thanks for signing up. We’re building NxtStps and will notify you when
          the full platform is available.
        </p>

        {/* Newsletter opt-in */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-50">
            Stay updated
          </h2>
          <p className="text-sm text-slate-300">
            Subscribe to our weekly newsletter for product updates and resources.
          </p>
          <form onSubmit={handleNewsletterSubmit} className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1C8C8C] focus:border-transparent"
              disabled={status === "loading"}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-lg bg-[#1C8C8C] px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#21a3a3] disabled:opacity-50 transition"
            >
              {status === "loading"
                ? "Subscribing…"
                : status === "success"
                  ? "Subscribed"
                  : "Subscribe to newsletter"}
            </button>
          </form>
          {status === "success" && (
            <p className="text-sm text-emerald-400">Thanks for subscribing.</p>
          )}
          {status === "error" && (
            <p className="text-sm text-red-400">Something went wrong. Try again.</p>
          )}
        </div>

        <Link
          href="/"
          className="inline-block text-sm text-slate-400 hover:text-slate-200 underline underline-offset-2"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
