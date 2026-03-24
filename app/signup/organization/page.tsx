"use client";

import Link from "next/link";
import { OrganizationCreationSection } from "@/components/org/OrganizationCreationSection";

/**
 * Create an organization after you have an account. You become org admin.
 * Select from directory (or request to join if exists) or submit new org for approval.
 */
export default function OrganizationSignupPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-12">
      <div className="max-w-md mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Register your organization</h1>
          <p className="text-sm text-slate-400 mt-2">
            Sign in, then select your agency from the Illinois Crime Victim Assistance directory, or
            submit a new organization if it&apos;s not listed. If you don&apos;t have an account
            yet,{" "}
            <Link href="/signup" className="text-emerald-400 hover:underline">
              create one first
            </Link>
            .
          </p>
        </header>

        <OrganizationCreationSection
          backLink={
            <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
              ← Home
            </Link>
          }
        />
      </div>
    </main>
  );
}
