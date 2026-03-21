import Link from "next/link";
import { MethodologyRelatedNav } from "@/components/public/MethodologyRelatedNav";
import { PublicBottomCta } from "@/components/public/PublicBottomCta";

export default function TransparencyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8 text-sm text-slate-200 leading-relaxed">
        <Link href="/help" className="text-xs text-slate-500 hover:text-slate-300 inline-block">
          ← Help
        </Link>

        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Trust &amp; safety</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">
            Transparency on NxtStps
          </h1>
          <p className="text-slate-400 max-w-2xl">
            We balance clarity for survivors and partners with protection for sensitive data—here’s
            what that means in practice.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-slate-100 mb-2">What this page is for</h2>
            <p className="text-slate-300">
              To show what information may appear in the product versus what stays internal—so you
              know what to expect.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 mb-2">What we show in the product</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-1.5">
              <li>Matching suggestions with short, specific reasons (e.g. service or area fit).</li>
              <li>Organization designation tier and plain-language summary text.</li>
              <li>These help pages describing matching and designations at a high level.</li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 mb-2">What we don’t show publicly</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-1.5">
              <li>Internal numeric scores or detailed grading breakdowns.</li>
              <li>Raw audit trails of every platform action (staff tools).</li>
              <li>Rankings, leaderboards, or “best org” comparisons.</li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 mb-2">Why this exists</h2>
            <p className="text-slate-300">
              Survivors deserve understandable suggestions; organizations deserve fair representation.
              Transparency pages set expectations without exposing internal operations.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 mb-2">Review requests</h2>
            <p className="text-slate-300">
              Organization admins can submit a <strong className="text-slate-200">designation review request</strong> from
              organization settings. Staff respond in writing; numeric scores are still not shared in
              that flow.
            </p>
          </div>
        </section>

        <MethodologyRelatedNav />
        <PublicBottomCta />
      </div>
    </main>
  );
}
