import Link from "next/link";

export const metadata = {
  title: "Transparency · NxtStps",
};

export default function TransparencyPage() {
  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6 text-sm text-slate-200 leading-relaxed">
        <Link href="/help" className="text-xs text-slate-400 hover:text-slate-200">
          ← Help
        </Link>
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Transparency</p>
          <h1 className="text-3xl font-bold text-slate-50">What we show vs. what stays internal</h1>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <h2 className="font-semibold text-slate-100">Public-safe / org-visible</h2>
          <ul className="list-disc list-inside text-slate-300 space-y-2">
            <li>Matching suggestions with short, specific reasons (e.g. service or area fit).</li>
            <li>Organization designation tier and explanatory summary text (readiness language).</li>
            <li>Methodology pages describing how matching and designations work at a high level.</li>
          </ul>
          <h2 className="font-semibold text-slate-100 pt-2">Internal only</h2>
          <ul className="list-disc list-inside text-slate-300 space-y-2">
            <li>Numeric internal quality scores and detailed grading breakdowns.</li>
            <li>Raw audit trails of every platform action (staff use).</li>
            <li>Leaderboards, “best org,” or side-by-side public rankings.</li>
          </ul>
          <h2 className="font-semibold text-slate-100 pt-2">Review requests</h2>
          <p>
            Organization admins and supervisors can submit a <strong>designation review request</strong>{" "}
            from the organization settings area. You can ask for clarification, report updated
            platform use, or request a correction. Platform staff respond in writing; numeric scores
            are still not shared in that flow.
          </p>
        </section>

        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            href="/help/how-matching-works"
            className="text-teal-400 hover:text-teal-300 underline"
          >
            How matching works
          </Link>
          <Link
            href="/help/how-designations-work"
            className="text-teal-400 hover:text-teal-300 underline"
          >
            How designations work
          </Link>
        </div>
      </div>
    </main>
  );
}
