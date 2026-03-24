"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { ROUTES } from "@/lib/routes/pageRegistry";

function ConnectAdvocateForm() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("case")?.trim() ?? "";

  const [advocateEmail, setAdvocateEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = Boolean(caseId) && Boolean(accessToken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const email = advocateEmail.trim().toLowerCase();
    if (!email || !caseId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/advocate-connections/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ advocate_email: email, case_id: caseId }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(getApiErrorMessage(json, "Failed to send connection request"));
        return;
      }

      setAdvocateEmail("");
      router.replace(ROUTES.victimDashboard);
      router.refresh();
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
          {!caseId ? (
            <div className="mt-4 rounded-lg border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-sm text-amber-100/95">
              <p className="leading-relaxed">
                Connection requests are sent for a <strong className="font-semibold">specific case</strong>. Open{" "}
                <Link href={ROUTES.victimDashboard} className="text-emerald-300 underline underline-offset-2">
                  My Dashboard
                </Link>
                , select your case, then use &quot;Connect with an advocate&quot; so we can link the request to
                that application.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-300 mt-2">
                Enter your advocate&apos;s email address. They will receive one notification to accept your request
                for this case.
              </p>
              <p className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-100/90">
                Case selected: the request applies to this application only. If you are already connected with this
                advocate from an older account link, we may add them to this case without a new request.
              </p>
            </>
          )}
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4"
        >
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
              disabled={!canSubmit}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
            />
          </label>

          {err && (
            <div className="text-sm text-red-300 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !advocateEmail.trim() || !canSubmit}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Sending…" : "Send connection request"}
          </button>
        </form>

        <p className="text-xs text-slate-500">
          Don&apos;t have an advocate yet? You can still{" "}
          <Link href={ROUTES.compensationHub} className="text-emerald-400 hover:text-emerald-300 underline">
            start your application
          </Link>{" "}
          and invite one later from your dashboard with a case selected.
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
