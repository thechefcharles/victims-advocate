import Link from "next/link";

export const metadata = {
  title: "How designations work · NxtStps",
};

export default function HowDesignationsWorkPage() {
  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6 text-sm text-slate-200 leading-relaxed">
        <Link href="/help" className="text-xs text-slate-400 hover:text-slate-200">
          ← Help
        </Link>
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Transparency</p>
          <h1 className="text-3xl font-bold text-slate-50">How organization designations work</h1>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <p>
            A <strong>designation</strong> is a short, plain-language label about how much structured
            readiness an organization shows <em>on the NxtStps platform</em> — for example profile
            completeness, use of workflows, messaging, and similar signals we can observe in the
            product.
          </p>
          <p>
            Designations are <strong>not</strong> clinical ratings, legal judgments, or reviews from
            survivors. We <strong>do not publish numeric quality scores</strong> publicly.
          </p>
          <p>Tiers use calm language such as:</p>
          <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
            <li>
              <strong>Comprehensive</strong> — strong signals across several readiness dimensions on
              the platform.
            </li>
            <li>
              <strong>Established</strong> — solid capability in multiple areas, with room to grow.
            </li>
            <li>
              <strong>Foundational</strong> — building structured presence; not a negative label.
            </li>
            <li>
              <strong>Insufficient data</strong> — not enough consistent platform activity yet to
              summarize fairly. This avoids mislabeling organizations that are simply new or
              lightly instrumented.
            </li>
          </ul>
          <p>
            Organizations can <strong>request a review</strong> of their designation if something
            looks wrong or if they have updated how they use the platform. Staff respond with a
            written reply visible to the organization; in some cases the designation may be
            recomputed from updated internal signals.
          </p>
        </section>

        <p className="text-xs text-slate-500">
          <Link href="/help/how-matching-works" className="text-teal-400 hover:text-teal-300">
            How matching works →
          </Link>
          {" · "}
          <Link href="/help/transparency" className="text-teal-400 hover:text-teal-300">
            Transparency overview →
          </Link>
        </p>
      </div>
    </main>
  );
}
