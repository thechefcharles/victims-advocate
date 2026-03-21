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
    <main className="min-h-screen bg-gradient-to-b from-[#042a2e] via-[#061e24] to-[#020b16] text-slate-50 px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(45,212,191,0.12),transparent)] pointer-events-none" />
      <div className="relative max-w-3xl mx-auto space-y-8">
        <header className="space-y-2 border-b border-teal-800/40 pb-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-teal-400/90 font-medium">
            Advocate workspace
          </p>
          <h1 className="text-3xl font-semibold text-teal-50 tracking-tight">
            Support &amp; case tools
          </h1>
          <p className="text-sm text-teal-100/65 max-w-lg">
            Your invited clients are listed below. Use the command center for org-wide workload and
            alerts.
          </p>
          {email && (
            <p className="text-xs text-teal-200/45 pt-1">
              Signed in as <span className="text-teal-100/80">{email}</span>
            </p>
          )}
        </header>

        <Link
          href={ROUTES.advocateHome}
          className="group block rounded-2xl border border-slate-700/80 bg-slate-950/50 p-6 hover:border-teal-700/50 hover:bg-slate-900/60 transition"
        >
          <h2 className="text-lg font-semibold text-slate-100 group-hover:text-teal-100">
            Command Center
          </h2>
          <p className="text-[12px] text-slate-400 mt-2 leading-relaxed max-w-xl">
            Workload, alerts, and org-scoped cases for your team.
          </p>
          <p className="text-[11px] text-teal-500/80 mt-4 font-medium">Continue →</p>
        </Link>

        <section id="clients" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-semibold text-teal-100">My clients</h2>
            <div className="flex gap-3">
              <Link
                href={ROUTES.advocateConnectionRequests}
                className="text-[11px] text-teal-400/80 hover:text-teal-300"
              >
                Connection requests →
              </Link>
              <Link
                href={ROUTES.dashboardClients}
                className="text-[11px] text-teal-400/80 hover:text-teal-300"
              >
                Full-page view →
              </Link>
            </div>
          </div>
          <AdvocateClientsList email={email} token={token} hideSignedInLine />
        </section>

        <p className="text-[11px] text-teal-200/35 text-center pt-2">
          <Link href={ROUTES.marketingLanding} className="hover:text-teal-200/60">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
