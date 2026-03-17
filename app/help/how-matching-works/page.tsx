import Link from "next/link";

export const metadata = {
  title: "How matching works · NxtStps",
};

export default function HowMatchingWorksPage() {
  return (
    <main className="min-h-screen bg-[#020b16] text-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6 text-sm text-slate-200 leading-relaxed">
        <Link href="/help" className="text-xs text-slate-400 hover:text-slate-200">
          ← Help
        </Link>
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Transparency</p>
          <h1 className="text-3xl font-bold text-slate-50">How survivor–organization matching works</h1>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <p>
            NxtStps suggests organizations using <strong>structured information</strong> from an
            application or case — for example services someone needs, language preferences, general
            location, accessibility needs, and whether virtual services may be acceptable.
          </p>
          <p>
            Each organization maintains a structured profile (services offered, languages, coverage
            area, capacity, and similar fields). The system compares those profiles to the needs
            you entered.
          </p>
          <p>
            Suggestions are <strong>explainable</strong>: you should see plain-language reasons, such
            as overlap on a type of support or fit with a state or region. This is not a popularity
            contest, star rating, or “best in city” ranking.
          </p>
          <p>
            <strong>Organization designations</strong> (readiness tiers on the platform) are separate
            from matching. Matching does not sort organizations by a public score or tier in a way
            that punishes organizations.
          </p>
          <p className="text-xs text-slate-500 pt-2">
            Logic is deterministic and rule-based on the platform — not driven by opaque AI ranking.
          </p>
        </section>

        <p className="text-xs text-slate-500">
          <Link href="/help/how-designations-work" className="text-teal-400 hover:text-teal-300">
            How designations work →
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
