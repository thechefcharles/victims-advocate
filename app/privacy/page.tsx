import Link from "next/link";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { PrivacyPolicyV2Document } from "@/components/legal/documents/PrivacyPolicyV2Document";

export const metadata = {
  title: "Privacy Policy · NxtStps",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="mb-4 flex flex-wrap gap-4 text-sm text-[var(--color-muted)]">
          <Link href="/" className="hover:text-[var(--color-charcoal)]">
            ← Home
          </Link>
          <Link href="/terms" className="hover:text-[var(--color-charcoal)]">
            Terms
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
          <h1 className="text-3xl font-bold">NxtStps, LLC — Privacy Policy</h1>
          <p className="text-sm text-[var(--color-slate)]">Version 2.0 · Effective April 5, 2026</p>
        </header>

        <section
          className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)] p-5"
          style={{ fontSize: "max(1.125rem, 18px)" }}
          aria-labelledby="public-privacy-summary-heading"
        >
          <h2
            id="public-privacy-summary-heading"
            className="text-lg font-semibold text-[var(--color-navy)] sm:text-xl"
          >
            In plain language, here is what you should know:
          </h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 leading-relaxed text-[var(--color-charcoal)]">
            <li>We only collect the information you choose to share with us.</li>
            <li>We never sell your data or share it for commercial purposes.</li>
            <li>We never use your information to train AI systems.</li>
            <li>We never use your information for advertising of any kind.</li>
            <li>
              Your information is protected under federal victim confidentiality laws including VOCA and
              VAWA.
            </li>
            <li>
              If you are in danger, look for the &quot;Exit Safely&quot; button in the app — it closes the
              platform immediately.
            </li>
            <li>You can request deletion of your data at any time.</li>
          </ul>
          <p className="mt-5 text-base leading-relaxed text-[var(--color-muted)] sm:text-[17px]">
            You are in control of your information. We are here to help, not to collect.
          </p>
        </section>

        <section className="max-w-none text-[var(--color-charcoal)]">
          <PrivacyPolicyV2Document />
        </section>

        <p className="text-[11px] text-[var(--color-muted)]">
          This is not legal advice. If you&apos;re in immediate danger, call 911. If you need support now,
          call or text 988.
        </p>

        <LegalFooterLinks />
      </div>
    </main>
  );
}
