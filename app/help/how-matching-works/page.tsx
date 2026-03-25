import Link from "next/link";
import { MethodologyRelatedNav } from "@/components/public/MethodologyRelatedNav";
import { PublicBottomCta } from "@/components/public/PublicBottomCta";

export default function HowMatchingWorksPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8 text-sm text-slate-200 leading-relaxed">
        <Link href="/help" className="text-xs text-slate-500 hover:text-slate-300 inline-block">
          ← Help
        </Link>

        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Trust &amp; safety</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">
            How victim–organization matching works
          </h1>
          <p className="text-slate-400 max-w-2xl">
            Suggestions are based on needs and explainable reasons—not popularity or hidden scores.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-slate-100 mb-2">What this system does</h2>
            <p className="text-slate-300">
              NxtStps compares structured information from your case—services you need, language,
              location, accessibility, and whether virtual help may work—with structured organization
              profiles (services, coverage, capacity, and similar fields).
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 mb-2">What it does not do</h2>
            <p className="text-slate-300">
              It does not rank organizations as “best,” use star ratings, or rely on opaque AI to
              reorder results. Suggestions should include plain-language reasons you can read.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 mb-2">Designations (small signal)</h2>
            <p className="text-slate-300">
              When an organization has a current designation with enough confidence, that may add a{" "}
              <strong className="text-slate-200">very small, capped</strong> signal after fit, coverage,
              capacity, language, and accessibility—not instead of them. Sparse data does not push
              organizations down; suggestions stay need-first.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 mb-2">Why it exists</h2>
            <p className="text-slate-300">
              To reduce guesswork when people are overwhelmed—while keeping logic explainable and
              rule-based on the platform.
            </p>
          </div>
          <p className="text-xs text-slate-500 pt-1">
            Matching logic is deterministic and rule-based—not driven by opaque AI ranking.
          </p>
        </section>

        <MethodologyRelatedNav />
        <PublicBottomCta />
      </div>
    </main>
  );
}
