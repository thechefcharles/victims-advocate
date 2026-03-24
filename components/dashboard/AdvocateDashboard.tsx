"use client";

import Link from "next/link";
import { AdvocateClientsList } from "@/components/dashboard/AdvocateClientsList";
import { ROUTES } from "@/lib/routes/pageRegistry";

export default function AdvocateDashboard({
  email,
  token,
}: {
  email: string | null;
  userId: string;
  token: string | null;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-300 px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)] pointer-events-none" />
      <div className="relative max-w-3xl mx-auto space-y-8">
        <header className="space-y-2 border-b border-slate-700 pb-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400 font-medium">
            Advocate workspace
          </p>
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            Support &amp; case tools
          </h1>
          <p className="text-sm text-slate-400 max-w-lg">
            Your invited clients are listed below. Use{" "}
            <Link href={ROUTES.advocateHome} className="text-slate-200 underline underline-offset-2 hover:text-white">
              My Dashboard
            </Link>{" "}
            for your full case queue, follow-up items, and organization view.
          </p>
          {email && (
            <p className="text-xs text-slate-500 pt-1">
              Signed in as <span className="text-slate-300">{email}</span>
            </p>
          )}
        </header>

        <Link
          href={ROUTES.advocateHome}
          className="group block rounded-2xl border border-slate-700 bg-slate-900 p-6 hover:bg-slate-800 transition"
        >
          <h2 className="text-lg font-semibold text-white group-hover:text-white">My Dashboard</h2>
          <p className="text-[12px] text-slate-400 mt-2 leading-relaxed max-w-xl">
            Your case work queue, secure message triage, and next steps in one place.
          </p>
          <p className="text-[11px] text-blue-400 mt-4 font-medium">Continue →</p>
        </Link>

        <section id="clients" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">My clients</h2>
            <div className="flex gap-3">
              <Link
                href={ROUTES.advocateConnectionRequests}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Connection requests →
              </Link>
              <Link
                href={ROUTES.dashboardClients}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Full-page list →
              </Link>
            </div>
          </div>
          <AdvocateClientsList email={email} token={token} hideSignedInLine />
        </section>

        <p className="text-[11px] text-slate-500 text-center pt-2">
          <Link href={ROUTES.marketingLanding} className="hover:text-slate-300">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
