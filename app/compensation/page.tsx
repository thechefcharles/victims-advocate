// app/compensation/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CompensationPage() {
  const router = useRouter();
  const [showStatePrompt, setShowStatePrompt] = useState(false);

  const handleStartIntake = (state: "IL" | "IN") => {
    setShowStatePrompt(false);
    router.push(`/compensation/intake?state=${state}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs tracking-[0.25em] uppercase text-slate-400">
            Crime Victims Compensation
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Get help applying for Crime Victims Compensation & Emergency
            Funeral Assistance
          </h1>
          <p className="text-sm text-slate-300">
            This assistant turns the official Crime Victims Compensation
            application into a clear, step-by-step process. It does not replace
            legal advice, but it helps you organize information, gather
            documents, and prepare a ready-to-submit application packet.
          </p>
        </header>

        {/* Callouts */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-sm space-y-2">
            <h2 className="text-sm font-semibold text-slate-100">
              1. Answer simple questions
            </h2>
            <p className="text-xs text-slate-300">
              We ask you one question at a time, in plain language, based on
              the official Illinois application sections.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-sm space-y-2">
            <h2 className="text-sm font-semibold text-slate-100">
              2. Upload documents
            </h2>
            <p className="text-xs text-slate-300">
              You can upload police reports, medical bills, funeral invoices,
              and other documents the state will need to review.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-sm space-y-2">
            <h2 className="text-sm font-semibold text-slate-100">
              3. Get a pre-filled application
            </h2>
            <p className="text-xs text-slate-300">
              NxtStps prepares a draft Crime Victims Compensation application
              you can download, review, and submit.
            </p>
          </div>
        </section>

        {/* Start CTA */}
        <section className="bg-slate-900/80 border border-emerald-500/40 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-50">
            Start your guided application
          </h2>
          <p className="text-sm text-slate-300">
            This guided intake is trauma-informed. You can stop at any time and
            come back later. We’ll start with basic information about the victim
            and move slowly into details about the crime, expenses, and
            documents.
          </p>

          <p className="text-[11px] text-slate-500 mt-2">
  Want to understand the program first?{" "}
  <a
    href="/knowledge/compensation"
    className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
  >
    Read the plain-language guide to CVC.
  </a>
</p>

          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={() => setShowStatePrompt(true)}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition"
            >
              Start guided intake
            </button>
            <span className="text-[11px] text-slate-400">
              Approximate time: 15–25 minutes. You don&apos;t need every
              document ready to begin.
            </span>
              <p className="text-xs text-slate-400 mt-4">
              Advocates:  
              <a
                href="/admin/cases"
                className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2 ml-1"
              >
                View all saved cases →
              </a>
            </p>

            <p className="text-[11px] text-slate-500 mt-2">
  Are you an advocate or case manager?{" "}
  <a
    href="/admin/cases"
    className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
  >
    Open your case dashboard →
  </a>
</p>
          </div>
        </section>

        {/* State selection modal */}
        {showStatePrompt && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setShowStatePrompt(false)}
          >
            <div
              className="rounded-2xl border border-slate-700 bg-slate-950 p-6 max-w-sm w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-slate-100">
                Select your state
              </h3>
              <p className="text-sm text-slate-300">
                Which state&apos;s Crime Victims Compensation program are you applying to?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleStartIntake("IL")}
                  className="w-full rounded-lg border border-slate-600 px-4 py-3 text-sm font-medium text-slate-100 hover:bg-slate-800/60 hover:border-emerald-500/50 transition text-left"
                >
                  Illinois
                </button>
                <button
                  type="button"
                  onClick={() => handleStartIntake("IN")}
                  className="w-full rounded-lg border border-slate-600 px-4 py-3 text-sm font-medium text-slate-100 hover:bg-slate-800/60 hover:border-emerald-500/50 transition text-left"
                >
                  Indiana
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowStatePrompt(false)}
                className="w-full text-sm text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* FAQ / reassurance */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-sm space-y-2">
            <h3 className="text-sm font-semibold text-slate-100">
              What you&apos;ll need (if you have it)
            </h3>
            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1.5">
              <li>Victim&apos;s full name, date of birth, and address</li>
              <li>Date and location of the crime</li>
              <li>Police report number (if you have it)</li>
              <li>Medical or funeral bills</li>
              <li>Employer name and income info (for lost wages)</li>
            </ul>
            <p className="text-[11px] text-slate-400 mt-2">
              If you don&apos;t have all of this, that&apos;s okay. We&apos;ll
              help you make a plan to get what&apos;s missing.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-sm space-y-2">
            <h3 className="text-sm font-semibold text-slate-100">
              Who this is for
            </h3>
            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1.5">
              <li>Victims of violent crime in Illinois or Indiana</li>
              <li>Family members of a deceased victim</li>
              <li>Anyone who has paid medical or funeral costs</li>
              <li>Advocates helping someone complete the application</li>
            </ul>
            <p className="text-[11px] text-slate-400 mt-2">
              This tool is not an official government website, but it is based
              on the official Illinois and Indiana Crime Victims Compensation applications.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}