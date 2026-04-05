import Link from "next/link";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { TermsOfUseV2Document } from "@/components/legal/documents/TermsOfUseV2Document";

export const metadata = {
  title: "Terms of Use · NxtStps",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex flex-wrap gap-4 text-sm text-[var(--color-muted)]">
          <Link href="/" className="hover:text-[var(--color-charcoal)]">
            ← Home
          </Link>
          <Link href="/privacy" className="hover:text-[var(--color-charcoal)]">
            Privacy
          </Link>
          <Link href="/waiver" className="hover:text-[var(--color-charcoal)]">
            Liability Waiver
          </Link>
          <Link href="/data-deletion" className="hover:text-[var(--color-charcoal)]">
            Data Deletion
          </Link>
        </div>
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">Legal</p>
          <h1 className="text-3xl font-bold">NxtStps, LLC — Terms of Use</h1>
          <p className="text-sm text-[var(--color-slate)]">
            Version 2.0 · Effective April 5, 2026
          </p>
        </header>

        <section className="max-w-none space-y-6 text-[var(--color-charcoal)]">
          <TermsOfUseV2Document />
        </section>

        <LegalFooterLinks />
      </div>
    </main>
  );
}
