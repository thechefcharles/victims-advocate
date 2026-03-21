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
        className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-center text-sm text-slate-500"
      >
        …
      </section>
    );
  }

  if (user) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 sm:p-6 text-center space-y-4">
        <p className="text-sm text-slate-400">
          You&apos;re signed in — continue in your workspace, or open compensation help anytime.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center flex-wrap">
          <Link
            href={getDashboardPath(me)}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
          >
            {getWorkspaceCtaLabel(me)}
          </Link>
          <Link
            href={ROUTES.compensationHub}
            className="inline-flex items-center justify-center rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800/60 transition"
          >
            Compensation Help
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 sm:p-6 text-center space-y-4">
      <p className="text-sm text-slate-400">Take the next step when you&apos;re ready.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center flex-wrap">
        <Link
          href={ROUTES.compensationHub}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
        >
          Get Help Now
        </Link>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800/60 transition"
        >
          Start My Application
        </Link>
      </div>
    </section>
  );
}
