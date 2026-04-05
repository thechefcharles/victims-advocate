import Link from "next/link";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { UserDataDeletionPolicyV2Document } from "@/components/legal/documents/UserDataDeletionPolicyV2Document";

export const metadata = {
  title: "User Data Deletion Policy · NxtStps",
};

export default function DataDeletionPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] px-6 py-10 text-[var(--color-navy)]">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="mb-4 flex flex-wrap gap-4 text-sm text-[var(--color-muted)]">
          <Link href="/" className="hover:text-[var(--color-charcoal)]">
            ← Home
          </Link>
          <Link href="/terms" className="hover:text-[var(--color-charcoal)]">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-[var(--color-charcoal)]">
            Privacy
          </Link>
        </div>
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">Legal</p>
          <h1 className="text-3xl font-bold">User Data Deletion Policy</h1>
          <p className="text-sm text-[var(--color-slate)]">Version 2.0 · Effective April 5, 2026</p>
        </header>

        <section className="max-h-[min(70vh,560px)] overflow-y-auto rounded-2xl border border-[var(--color-border-light)] bg-white/90 p-5 shadow-inner">
          <UserDataDeletionPolicyV2Document />
        </section>

        <p className="text-[11px] text-[var(--color-muted)]">
          This policy is informational and does not require acceptance to use the platform. To request
          deletion, use Account settings (signed in) or email the privacy contact listed in the policy.
        </p>

        <LegalFooterLinks />
      </div>
    </main>
  );
}
