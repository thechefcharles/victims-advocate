"use client";

import Link from "next/link";

/** Platform admin home — links to all admin tools and org overview. */
export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Platform admin</p>
          <h1 className="text-2xl font-semibold mt-1">Admin dashboard</h1>
          <p className="text-sm text-slate-400 mt-2">
            Manage organizations, programs, users, and platform-wide settings.
          </p>
        </header>

        <nav className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/orgs"
            className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 hover:border-emerald-500/40 transition"
          >
            <h2 className="font-medium text-slate-100">Organizations</h2>
            <p className="text-xs text-slate-400 mt-1">View and create all organizations</p>
          </Link>
          <Link
            href="/admin/ecosystem"
            className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 hover:border-emerald-500/40 transition"
          >
            <h2 className="font-medium text-slate-100">Ecosystem</h2>
            <p className="text-xs text-slate-400 mt-1">Cross-org overview</p>
          </Link>
          <Link
            href="/admin/cases"
            className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 hover:border-emerald-500/40 transition"
          >
            <h2 className="font-medium text-slate-100">All cases</h2>
            <p className="text-xs text-slate-400 mt-1">Browse every saved case</p>
          </Link>
          <Link
            href="/admin/users"
            className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 hover:border-emerald-500/40 transition"
          >
            <h2 className="font-medium text-slate-100">Users</h2>
            <p className="text-xs text-slate-400 mt-1">Enable / disable accounts</p>
          </Link>
          <Link
            href="/admin/knowledge"
            className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 hover:border-emerald-500/40 transition"
          >
            <h2 className="font-medium text-slate-100">Knowledge base</h2>
            <p className="text-xs text-slate-400 mt-1">Content management</p>
          </Link>
          <Link
            href="/admin/audit"
            className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 hover:border-emerald-500/40 transition"
          >
            <h2 className="font-medium text-slate-100">Audit log</h2>
            <p className="text-xs text-slate-400 mt-1">Security events</p>
          </Link>
        </nav>

        <p className="text-xs text-slate-500">
          <Link href="/" className="underline hover:text-slate-300">
            ← Home
          </Link>
        </p>
      </div>
    </main>
  );
}
