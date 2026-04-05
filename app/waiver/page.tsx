import Link from "next/link";
import { LiabilityWaiverV1Document } from "@/components/legal/documents/LiabilityWaiverV1Document";

export const metadata = {
  title: "Liability Waiver & Release of Claims · NxtStps",
};

export default function WaiverPage() {
  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] px-6 py-10 text-[var(--color-navy)]">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-wrap gap-4 text-sm text-[var(--color-muted)]">
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
        <article className="prose prose-sm max-w-none">
          <LiabilityWaiverV1Document />
        </article>
      </div>
    </main>
  );
}
