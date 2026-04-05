import Link from "next/link";
import { MethodologyRelatedNav } from "@/components/public/MethodologyRelatedNav";
import { PublicBottomCta } from "@/components/public/PublicBottomCta";

export default function HowDesignationsWorkPage() {
  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8 text-sm text-[var(--color-charcoal)] leading-relaxed">
        <Link href="/help" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-slate)] inline-block">
          ← Help
        </Link>

        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">Trust &amp; safety</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-navy)]">
            How organization designations work
          </h1>
          <p className="text-[var(--color-muted)] max-w-2xl">
            Designations describe platform readiness in plain language—not clinical quality or legal
            outcomes.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/85 p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-[var(--color-navy)] mb-2">What this system does</h2>
            <p className="text-[var(--color-slate)]">
              A <strong className="text-[var(--color-charcoal)]">designation</strong> is a short label about structured
              readiness an organization shows <em>on NxtStps</em>—for example profile completeness,
              use of workflows, messaging, and similar signals we can observe in the product.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-[var(--color-navy)] mb-2">What it does not do</h2>
            <p className="text-[var(--color-slate)]">
              Designations are <strong className="text-[var(--color-charcoal)]">not</strong> clinical ratings, legal
              judgments, or victim reviews. We <strong className="text-[var(--color-charcoal)]">do not</strong>{" "}
              publish numeric quality scores publicly.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-[var(--color-navy)] mb-2">Why it exists</h2>
            <p className="text-[var(--color-slate)]">
              To give victims and partners a readable signal of how organizations show up on the
              platform—without pretending to measure real-world service quality.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-[var(--color-navy)] mb-2">Tiers (plain language)</h2>
            <ul className="list-disc list-inside text-[var(--color-slate)] space-y-1.5 ml-1">
              <li>
                <strong className="text-[var(--color-charcoal)]">Comprehensive</strong> — strong signals across several
                readiness dimensions on the platform.
              </li>
              <li>
                <strong className="text-[var(--color-charcoal)]">Established</strong> — solid capability in multiple
                areas, with room to grow.
              </li>
              <li>
                <strong className="text-[var(--color-charcoal)]">Foundational</strong> — building structured presence;
                not a negative label.
              </li>
              <li>
                <strong className="text-[var(--color-charcoal)]">Insufficient data</strong> — not enough consistent
                activity yet to summarize fairly.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-[var(--color-navy)] mb-2">Review requests</h2>
            <p className="text-[var(--color-slate)]">
              Organizations can request a review if something looks wrong or the platform usage has
              changed. Staff reply in writing; designations may be recomputed when appropriate.
            </p>
          </div>
        </section>

        <MethodologyRelatedNav />
        <PublicBottomCta />
      </div>
    </main>
  );
}
