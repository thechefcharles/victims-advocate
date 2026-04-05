"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getDashboardPath,
  getWorkspaceCtaLabel,
  type DashboardMe,
} from "@/lib/dashboardRoutes";
import { ROUTES } from "@/lib/routes/pageRegistry";

/**
 * Phase 7: consistent “next step” on public pages for signed-in vs signed-out visitors.
 */
export function PublicBottomCta() {
  const { loading, user, isAdmin, role, orgId, orgRole } = useAuth();
  const me: DashboardMe = { isAdmin, role, orgId, orgRole };

  if (loading) {
    return (
      <section
        aria-hidden
        className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/75 p-5 text-center text-sm text-[var(--color-muted)]"
      >
        …
      </section>
    );
  }

  if (user) {
    return (
      <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/75 p-5 sm:p-6 text-center space-y-4">
        <p className="text-sm text-[var(--color-muted)]">
          You&apos;re signed in — continue in your workspace, or open compensation help anytime.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center flex-wrap">
          <Link
            href={getDashboardPath(me)}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--color-teal-deep)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-teal)] transition"
          >
            {getWorkspaceCtaLabel(me)}
          </Link>
          <Link
            href={ROUTES.compensationHub}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-light-sand)]/75 transition"
          >
            Compensation Help
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/75 p-5 sm:p-6 text-center space-y-4">
      <p className="text-sm text-[var(--color-muted)]">Take the next step when you&apos;re ready.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center flex-wrap">
        <Link
          href={ROUTES.compensationHub}
          className="inline-flex items-center justify-center rounded-xl bg-[var(--color-teal-deep)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-teal)] transition"
        >
          Get Help Now
        </Link>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-light-sand)]/75 transition"
        >
          Start My Application
        </Link>
      </div>
    </section>
  );
}
