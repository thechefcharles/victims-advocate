"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { ROUTES } from "@/lib/routes/pageRegistry";

function ConnectAdvocateForm() {
  const { accessToken } = useAuth();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("case")?.trim() ?? "";

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
      const body: { advocate_email: string; case_id?: string } = { advocate_email: email };
      if (caseId) body.case_id = caseId;

      const res = await fetch("/api/advocate-connections/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      const data = (json?.data ?? json) as {
        added_to_case?: boolean;
        message?: string;
      };

      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Failed to send connection request"));
        return;
      }

      if (data.added_to_case) {
        setSuccess(
          data.message ??
            "Your advocate has been linked to this case. You can return to your dashboard to confirm."
        );
      } else {
        setSuccess(
          data.message ??
            "Connection request sent. The advocate will receive a notification to accept you."
        );
      }
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
            href={ROUTES.compensationHub}
            className="text-sm text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 mb-4"
          >
            ← Back to compensation
          </Link>
          <h1 className="text-2xl font-bold">Connect with an advocate</h1>
          <p className="text-sm text-slate-300 mt-2">
            Enter your advocate&apos;s email address. They will receive a notification to accept
            your request.
            {caseId
              ? " This request is for the application you opened from your dashboard."
              : " If you open this page from your dashboard with a case selected, we can link them to that case."}
          </p>
          {caseId ? (
            <p className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-100/90">
              Case selected: requests and acceptance will apply to this application. If you are
              already connected with this advocate, we will add them to this case when possible.
            </p>
          ) : null}
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
            {loading ? "Sending…" : caseId ? "Send case connection request" : "Send connection request"}
          </button>
        </form>

        <p className="text-xs text-slate-500">
          Don&apos;t have an advocate yet? You can still{" "}
          <Link href={ROUTES.compensationHub} className="text-emerald-400 hover:text-emerald-300 underline">
            start your application
          </Link>{" "}
          and invite one later when you save your case.
        </p>
      </div>
    </main>
  );
}

export default function ConnectAdvocatePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-8">
          <div className="max-w-lg mx-auto text-sm text-slate-400">Loading…</div>
        </main>
      }
    >
      <ConnectAdvocateForm />
    </Suspense>
  );
}
