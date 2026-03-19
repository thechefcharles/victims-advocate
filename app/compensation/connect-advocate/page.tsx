"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { getApiErrorMessage } from "@/lib/utils/apiError";

export default function ConnectAdvocatePage() {
  const { accessToken } = useAuth();
  const [advocateEmail, setAdvocateEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    const email = advocateEmail.trim().toLowerCase();
    if (!email) return;

    setLoading(true);
    try {
      const res = await fetch("/api/advocate-connections/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ advocate_email: email }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Failed to send connection request"));
        return;
      }

      setSuccess("Connection request sent. The advocate will receive a notification to accept you.");
      setAdvocateEmail("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <header>
          <Link
            href="/compensation"
            className="text-sm text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 mb-4"
          >
            ← Back to compensation
          </Link>
          <h1 className="text-2xl font-bold">Connect with an advocate</h1>
          <p className="text-sm text-slate-300 mt-2">
            Enter your advocate&apos;s email address. They will receive a notification to accept
            you as their client. Once accepted, you can invite them to your cases.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">
              Advocate&apos;s email
            </span>
            <input
              type="email"
              value={advocateEmail}
              onChange={(e) => setAdvocateEmail(e.target.value)}
              placeholder="advocate@agency.org"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </label>

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
            type="submit"
            disabled={loading || !advocateEmail.trim()}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Sending…" : "Send connection request"}
          </button>
        </form>

        <p className="text-xs text-slate-500">
          Don&apos;t have an advocate yet? You can still{" "}
          <Link href="/compensation" className="text-emerald-400 hover:text-emerald-300 underline">
            start your application
          </Link>{" "}
          and invite one later when you save your case.
        </p>
      </div>
    </main>
  );
}
