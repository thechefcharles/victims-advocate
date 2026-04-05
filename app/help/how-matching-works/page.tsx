import Link from "next/link";
import { MethodologyRelatedNav } from "@/components/public/MethodologyRelatedNav";
import { PublicBottomCta } from "@/components/public/PublicBottomCta";

export default function HowMatchingWorksPage() {
  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8 text-sm text-[var(--color-charcoal)] leading-relaxed">
        <Link href="/help" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-slate)] inline-block">
          ← Help
        </Link>

        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">Trust &amp; safety</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-navy)]">
            How victim–organization matching works
          </h1>
          <p className="text-[var(--color-muted)] max-w-2xl">
            Suggestions are based on needs and explainable reasons—not popularity or hidden scores.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-[var(--color-navy)] mb-2">What this system does</h2>
            <p className="text-[var(--color-slate)]">
              NxtStps compares structured information from your case—services you need, language,
              location, accessibility, and whether virtual help may work—with structured organization
              profiles (services, coverage, capacity, and similar fields).
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-[var(--color-navy)] mb-2">What it does not do</h2>
            <p className="text-[var(--color-slate)]">
              It does not rank organizations as “best,” use star ratings, or rely on opaque AI to
              reorder results. Suggestions should include plain-language reasons you can read.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-[var(--color-navy)] mb-2">Designations (small signal)</h2>
            <p className="text-[var(--color-slate)]">
              When an organization has a current designation with enough confidence, that may add a{" "}
              <strong className="text-[var(--color-charcoal)]">very small, capped</strong> signal after fit, coverage,
              capacity, language, and accessibility—not instead of them. Sparse data does not push
              organizations down; suggestions stay need-first.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-[var(--color-navy)] mb-2">Why it exists</h2>
            <p className="text-[var(--color-slate)]">
              To reduce guesswork when people are overwhelmed—while keeping logic explainable and
              rule-based on the platform.
            </p>
          </div>
          <p className="text-xs text-[var(--color-muted)] pt-1">
            Matching logic is deterministic and rule-based—not driven by opaque AI ranking.
          </p>
        </section>

        <MethodologyRelatedNav />
        <PublicBottomCta />
      </div>
    </main>
  );
}
