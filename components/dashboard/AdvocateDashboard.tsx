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
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-slate)] px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)] pointer-events-none" />
      <div className="relative max-w-3xl mx-auto space-y-8">
        <header className="space-y-2 border-b border-[var(--color-border)] pb-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-muted)] font-medium">
            Advocate workspace
          </p>
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            Support &amp; case tools
          </h1>
          <p className="text-sm text-[var(--color-muted)] max-w-lg">
            Your invited clients are listed below. Use{" "}
            <Link href={ROUTES.advocateHome} className="text-[var(--color-charcoal)] underline underline-offset-2 hover:text-white">
              My Dashboard
            </Link>{" "}
            for your full case queue, follow-up items, and organization view.
          </p>
          {email && (
            <p className="text-xs text-[var(--color-muted)] pt-1">
              Signed in as <span className="text-[var(--color-slate)]">{email}</span>
            </p>
          )}
        </header>

        <Link
          href={ROUTES.advocateHome}
          className="group block rounded-2xl border border-[var(--color-border)] bg-white p-6 hover:bg-[var(--color-light-sand)] transition"
        >
          <h2 className="text-lg font-semibold text-white group-hover:text-white">My Dashboard</h2>
          <p className="text-[12px] text-[var(--color-muted)] mt-2 leading-relaxed max-w-xl">
            Your case work queue, secure message triage, and next steps in one place.
          </p>
          <p className="text-[11px] text-[var(--color-teal)] mt-4 font-medium">Continue →</p>
        </Link>

        <section id="clients" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">My clients</h2>
            <div className="flex gap-3">
              <Link
                href={ROUTES.advocateConnectionRequests}
                className="text-[11px] text-[var(--color-muted)] hover:text-white"
              >
                Connection requests →
              </Link>
              <Link
                href={ROUTES.dashboardClients}
                className="text-[11px] text-[var(--color-muted)] hover:text-white"
              >
                Full-page list →
              </Link>
            </div>
          </div>
          <AdvocateClientsList email={email} token={token} hideSignedInLine />
        </section>

        <p className="text-[11px] text-[var(--color-muted)] text-center pt-2">
          <Link href={ROUTES.marketingLanding} className="hover:text-[var(--color-slate)]">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
