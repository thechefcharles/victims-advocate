"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";

const cardClass =
  "rounded-xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 p-4 hover:border-emerald-500/35 transition text-left block";

const sectionLabel = "text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)] mb-3";

/** Platform admin home — unified control center (Phase 8, UI only). */
export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8 sm:py-10">
      <div className="max-w-5xl mx-auto space-y-10">
        <PageHeader
          contextLine="Admin → Home"
          eyebrow="Platform admin"
          title="Admin Home"
          subtitle="Manage platform operations, organizations, and system configuration."
        />

        {/* Priority actions */}
        <section aria-labelledby="priority-heading">
          <h2 id="priority-heading" className={sectionLabel}>
            Priority actions
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/admin/designation-reviews"
              className="rounded-xl border border-amber-500/40 bg-amber-950/25 p-4 hover:bg-amber-950/40 transition"
            >
              <p className="text-sm font-semibold text-amber-100">Review designation requests</p>
              <p className="text-xs text-amber-200/70 mt-1">Queue and resolve org requests</p>
            </Link>
            <Link
              href="/admin/orgs"
              className="rounded-xl border border-emerald-500/35 bg-emerald-950/20 p-4 hover:bg-emerald-950/35 transition"
            >
              <p className="text-sm font-semibold text-emerald-100">Review organizations</p>
              <p className="text-xs text-emerald-200/70 mt-1">Create and manage org records, approve pending proposals</p>
            </Link>
            <Link
              href="/admin/cases"
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-warm-cream)]/90 p-4 hover:border-emerald-500/40 transition"
            >
              <p className="text-sm font-semibold text-[var(--color-navy)]">Review cases</p>
              <p className="text-xs text-[var(--color-muted)] mt-1">Browse saved cases</p>
            </Link>
            <Link
              href="/admin/ecosystem"
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-warm-cream)]/90 p-4 hover:border-emerald-500/40 transition"
            >
              <p className="text-sm font-semibold text-[var(--color-navy)]">View ecosystem</p>
              <p className="text-xs text-[var(--color-muted)] mt-1">Coverage and gaps</p>
            </Link>
          </div>
        </section>

        <p className="text-xs text-[var(--color-muted)] border-l-2 border-[var(--color-border)] pl-3 py-1">
          <strong className="text-[var(--color-muted)]">Operations</strong> covers day-to-day case and org work.{" "}
          <strong className="text-[var(--color-muted)]">Configuration</strong> is programs, policies, and knowledge.{" "}
          <strong className="text-[var(--color-muted)]">Trust &amp; quality</strong> is grading and designations.{" "}
          <strong className="text-[var(--color-muted)]">Oversight</strong> is ecosystem-wide views and audit.
        </p>

        {/* A. Operations */}
        <section aria-labelledby="ops-heading">
          <h2 id="ops-heading" className={sectionLabel}>
            Operations
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/admin/cases" className={cardClass}>
              <h3 className="font-medium text-[var(--color-navy)]">Cases</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">Browse and open every saved case</p>
            </Link>
            <Link href="/admin/orgs" className={cardClass}>
              <h3 className="font-medium text-[var(--color-navy)]">Organizations</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">Org records and profiles</p>
            </Link>
            <Link href="/admin/users" className={cardClass}>
              <h3 className="font-medium text-[var(--color-navy)]">Users</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">Enable or disable accounts</p>
            </Link>
          </div>
        </section>

        {/* B. Configuration */}
        <section aria-labelledby="config-heading">
          <h2 id="config-heading" className={sectionLabel}>
            Configuration
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/admin/programs" className={cardClass}>
              <h3 className="font-medium text-[var(--color-navy)]">Programs</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">Routing programs and rule sets</p>
            </Link>
            <Link href="/admin/policies" className={cardClass}>
              <h3 className="font-medium text-[var(--color-navy)]">Policies</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">Terms, privacy, and policy versions</p>
            </Link>
            <Link href="/admin/knowledge" className={cardClass}>
              <h3 className="font-medium text-[var(--color-navy)]">Knowledge base</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">Help and eligibility content</p>
            </Link>
          </div>
        </section>

        {/* C. Trust & quality */}
        <section aria-labelledby="trust-heading">
          <h2 id="trust-heading" className={sectionLabel}>
            Trust &amp; quality
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/admin/grading" className={cardClass}>
              <h3 className="font-medium text-[var(--color-navy)]">Grading</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">CBO quality review (admin-only scores)</p>
            </Link>
            <Link href="/admin/designations" className={cardClass}>
              <h3 className="font-medium text-[var(--color-navy)]">Designations</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">Org designation tools</p>
            </Link>
            <Link href="/admin/designation-reviews" className={cardClass}>
              <h3 className="font-medium text-[var(--color-navy)]">Designation reviews</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">Formal requests from organizations</p>
            </Link>
          </div>
        </section>

        {/* D. Oversight */}
        <section aria-labelledby="oversight-heading">
          <h2 id="oversight-heading" className={sectionLabel}>
            Oversight
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/admin/ecosystem" className={cardClass}>
              <h3 className="font-medium text-[var(--color-navy)]">Ecosystem</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">Aggregated coverage and gaps</p>
            </Link>
            <Link href="/admin/audit" className={cardClass}>
              <h3 className="font-medium text-[var(--color-navy)]">Audit log</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">Security and platform events</p>
            </Link>
          </div>
        </section>

        <p className="text-xs text-[var(--color-muted)]">
          <Link href="/" className="underline hover:text-[var(--color-slate)]">
            ← Home
          </Link>
        </p>
      </div>
    </main>
  );
}
